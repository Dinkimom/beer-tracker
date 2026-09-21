import type {
  SprintContextAvailabilityEvent,
  SprintContextCalendarDay,
  SprintContextCapacityOverlap,
  SprintContextCapacityPerson,
  SprintContextCapacityPersonDay,
  SprintContextCapacityReport,
  SprintContextPayload,
  SprintContextPosition,
} from '@/lib/sprints/sprintContextTypes';

import { PARTS_PER_DAY } from '@/constants';

function cellKey(day: number, part: number): string {
  return `${day}:${part}`;
}

function expandSegmentCells(
  startDay: number,
  startPart: number,
  duration: number
): Array<{ day: number; part: number }> {
  const cells: Array<{ day: number; part: number }> = [];
  let day = startDay;
  let part = startPart;
  const safeDuration = Math.max(0, Math.floor(duration));
  for (let i = 0; i < safeDuration; i++) {
    cells.push({ day, part });
    part += 1;
    if (part >= PARTS_PER_DAY) {
      part = 0;
      day += 1;
    }
  }
  return cells;
}

/** Expand a position into occupied day/part cells (same model as planner). */
export function expandPositionOccupiedCells(
  position: Pick<SprintContextPosition, 'duration' | 'segments' | 'startDay' | 'startPart'>
): Array<{ day: number; part: number }> {
  if (position.segments && position.segments.length > 0) {
    return position.segments.flatMap((segment) =>
      expandSegmentCells(segment.startDay, segment.startPart, segment.duration)
    );
  }
  return expandSegmentCells(position.startDay, position.startPart, position.duration);
}

function dateByDayMap(calendarDays: SprintContextCalendarDay[]): Map<number, string> {
  return new Map(calendarDays.map((item) => [item.day, item.date]));
}

function assigneeMatchIds(assigneeId: string): Set<string> {
  return new Set(
    [assigneeId, assigneeId.replace(/^staff:/i, '')].map((value) => value.trim()).filter(Boolean)
  );
}

function eventMatchesAssignee(event: SprintContextAvailabilityEvent, ids: Set<string>): boolean {
  return ids.has(event.memberId) || ids.has(`staff:${event.memberId}`);
}

function unavailableDaysForAssignee(
  assigneeId: string,
  availability: SprintContextAvailabilityEvent[],
  calendarDays: SprintContextCalendarDay[]
): Set<number> {
  const ids = assigneeMatchIds(assigneeId);
  const unavailable = new Set<number>();
  for (const event of availability) {
    if (!eventMatchesAssignee(event, ids)) {
      continue;
    }
    for (const day of calendarDays) {
      if (day.date >= event.startDate && day.date <= event.endDate) {
        unavailable.add(day.day);
      }
    }
  }
  return unavailable;
}

function collectCellsByKey(positions: SprintContextPosition[]): Map<string, string[]> {
  const cellsByKey = new Map<string, string[]>();
  for (const position of positions) {
    for (const cell of expandPositionOccupiedCells(position)) {
      const key = cellKey(cell.day, cell.part);
      const list = cellsByKey.get(key) ?? [];
      list.push(position.taskId);
      cellsByKey.set(key, list);
    }
  }
  return cellsByKey;
}

function buildOverlapsFromCells(
  cellsByKey: Map<string, string[]>,
  dateByDay: Map<number, string>
): SprintContextCapacityOverlap[] {
  const overlaps: SprintContextCapacityOverlap[] = [];
  for (const [key, taskIds] of cellsByKey) {
    if (taskIds.length < 2) {
      continue;
    }
    const [dayStr, partStr] = key.split(':');
    const day = Number(dayStr);
    const part = Number(partStr);
    const overlap: SprintContextCapacityOverlap = {
      cell: { day, part },
      taskIds: [...new Set(taskIds)],
    };
    const date = dateByDay.get(day);
    if (date) {
      overlap.date = date;
    }
    overlaps.push(overlap);
  }
  return overlaps;
}

function loadPartsForDay(dayIndex: number, cellsByKey: Map<string, string[]>): number {
  let loadParts = 0;
  for (let part = 0; part < PARTS_PER_DAY; part++) {
    if (cellsByKey.has(cellKey(dayIndex, part))) {
      loadParts += 1;
    }
  }
  return loadParts;
}

function buildPersonDays(
  calendarDays: SprintContextCalendarDay[],
  cellsByKey: Map<string, string[]>,
  unavailableDays: Set<number>
): SprintContextCapacityPersonDay[] {
  return calendarDays.map((calendarDay) => {
    const row: SprintContextCapacityPersonDay = {
      day: calendarDay.day,
      loadParts: loadPartsForDay(calendarDay.day, cellsByKey),
      maxParts: PARTS_PER_DAY,
    };
    if (calendarDay.date) {
      row.date = calendarDay.date;
    }
    if (unavailableDays.has(calendarDay.day)) {
      row.unavailable = true;
    }
    return row;
  });
}

function gapForPart(
  day: SprintContextCapacityPersonDay,
  part: number,
  cellsByKey: Map<string, string[]>
): SprintContextCapacityPerson['gaps'][number] | null {
  if (cellsByKey.has(cellKey(day.day, part))) {
    return null;
  }
  const gap: SprintContextCapacityPerson['gaps'][number] = { day: day.day, part };
  if (day.date) {
    gap.date = day.date;
  }
  return gap;
}

function buildGaps(
  days: SprintContextCapacityPersonDay[],
  cellsByKey: Map<string, string[]>
): SprintContextCapacityPerson['gaps'] {
  const gaps: SprintContextCapacityPerson['gaps'] = [];
  for (const day of days) {
    if (day.unavailable) {
      continue;
    }
    for (let part = 0; part < PARTS_PER_DAY; part++) {
      const gap = gapForPart(day, part, cellsByKey);
      if (gap) {
        gaps.push(gap);
      }
    }
  }
  return gaps;
}

function buildPersonCapacity(input: {
  assigneeId: string;
  assigneeName?: string | null;
  calendarDays: SprintContextCalendarDay[];
  positions: SprintContextPosition[];
  unavailableDays: Set<number>;
}): SprintContextCapacityPerson {
  const dateByDay = dateByDayMap(input.calendarDays);
  const cellsByKey = collectCellsByKey(input.positions);
  const overlaps = buildOverlapsFromCells(cellsByKey, dateByDay);
  const days = buildPersonDays(input.calendarDays, cellsByKey, input.unavailableDays);
  const gaps = buildGaps(days, cellsByKey);
  const totalLoadParts = days.reduce((sum, day) => sum + day.loadParts, 0);
  const totalMaxParts = days.reduce(
    (sum, day) => sum + (day.unavailable ? 0 : day.maxParts),
    0
  );

  const person: SprintContextCapacityPerson = {
    assigneeId: input.assigneeId,
    days,
    gaps,
    overlaps,
    totalLoadParts,
    totalMaxParts,
  };
  if (input.assigneeName != null) {
    person.assigneeName = input.assigneeName;
  }
  return person;
}

function groupPositionsByAssignee(
  positions: SprintContextPosition[]
): Map<string, SprintContextPosition[]> {
  const byAssignee = new Map<string, SprintContextPosition[]>();
  for (const position of positions) {
    if (position.assigneeId.startsWith('feature-draft:')) {
      continue;
    }
    const list = byAssignee.get(position.assigneeId) ?? [];
    list.push(position);
    byAssignee.set(position.assigneeId, list);
  }
  return byAssignee;
}

function overloadedItemForDay(
  person: SprintContextCapacityPerson,
  day: SprintContextCapacityPersonDay
): SprintContextCapacityReport['overloaded'][number] | null {
  const hasOverlap = person.overlaps.some((o) => o.cell.day === day.day);
  const workWhileAway = Boolean(day.unavailable && day.loadParts > 0);
  if (!hasOverlap && !workWhileAway) {
    return null;
  }
  const item: SprintContextCapacityReport['overloaded'][number] = {
    assigneeId: person.assigneeId,
    day: day.day,
    loadParts: day.loadParts,
  };
  if (person.assigneeName != null) {
    item.assigneeName = person.assigneeName;
  }
  if (day.date) {
    item.date = day.date;
  }
  return item;
}

function collectOverloaded(
  people: SprintContextCapacityPerson[]
): SprintContextCapacityReport['overloaded'] {
  const overloaded: SprintContextCapacityReport['overloaded'] = [];
  for (const person of people) {
    for (const day of person.days) {
      const item = overloadedItemForDay(person, day);
      if (item) {
        overloaded.push(item);
      }
    }
  }
  return overloaded;
}

function buildCapacitySummary(
  people: SprintContextCapacityPerson[],
  overloadedCount: number
): string {
  const overlapCount = people.reduce((sum, person) => sum + person.overlaps.length, 0);
  const gapHint = people
    .filter((person) => person.gaps.length > 0)
    .slice(0, 3)
    .map((person) => `${person.assigneeName ?? person.assigneeId}: ${person.gaps.length} free part(s)`)
    .join('; ');
  const summaryParts = [
    `${people.length} assignee(s)`,
    `${overlapCount} overlap cell(s)`,
    `${overloadedCount} overloaded day(s)`,
  ];
  if (gapHint) {
    summaryParts.push(gapHint);
  }
  return summaryParts.join(' · ');
}

export function buildSprintContextCapacity(
  payload: Pick<SprintContextPayload, 'availability' | 'meta' | 'positions'>
): SprintContextCapacityReport {
  const calendarDays = payload.meta.calendarDays ?? [];
  const byAssignee = groupPositionsByAssignee(payload.positions);
  const people: SprintContextCapacityPerson[] = [];
  for (const [assigneeId, positions] of byAssignee) {
    const assigneeName = positions.find((p) => p.assigneeName)?.assigneeName ?? null;
    people.push(
      buildPersonCapacity({
        assigneeId,
        assigneeName,
        calendarDays,
        positions,
        unavailableDays: unavailableDaysForAssignee(
          assigneeId,
          payload.availability,
          calendarDays
        ),
      })
    );
  }
  people.sort((a, b) => (a.assigneeName ?? a.assigneeId).localeCompare(b.assigneeName ?? b.assigneeId));
  const overloaded = collectOverloaded(people);
  return {
    overloaded,
    people,
    summary: buildCapacitySummary(people, overloaded.length),
  };
}
