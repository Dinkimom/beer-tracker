import type {
  SprintContextCalendarDay,
  SprintContextPosition,
} from '@/lib/sprints/sprintContextTypes';

import { DEFAULT_PLANNER_TIMELINE_SCALE } from '@/lib/plannerTimelineScale';
import { expandPositionOccupiedCells } from '@/lib/sprints/sprintContextCapacity';

function resolvePartsPerDay(partsPerDay: number | undefined): number {
  if (
    typeof partsPerDay === 'number' &&
    Number.isInteger(partsPerDay) &&
    partsPerDay >= 2 &&
    partsPerDay <= 4
  ) {
    return partsPerDay;
  }
  return DEFAULT_PLANNER_TIMELINE_SCALE.timeslotsPerDay;
}

function dateByDayMap(calendarDays: SprintContextCalendarDay[]): Map<number, string> {
  return new Map(calendarDays.map((item) => [item.day, item.date]));
}

function formatSlot(
  day: number,
  part: number,
  dateByDay: Map<number, string>,
  partsPerDay: number
): string {
  const date = dateByDay.get(day);
  const slot = `${part + 1}/${partsPerDay}`;
  if (date) {
    return `${date} (${slot})`;
  }
  return `day ${day} (${slot})`;
}

function formatDurationDays(durationParts: number, partsPerDay: number): string {
  const days = Math.round((durationParts / partsPerDay) * 100) / 100;
  return `${days}d`;
}

function formatCellSpan(
  cells: Array<{ day: number; part: number }>,
  dateByDay: Map<number, string>,
  partsPerDay: number
): string {
  const first = cells[0]!;
  const last = cells[cells.length - 1]!;
  const start = formatSlot(first.day, first.part, dateByDay, partsPerDay);
  const end = formatSlot(last.day, last.part, dateByDay, partsPerDay);
  return first.day === last.day && first.part === last.part ? start : `${start} – ${end}`;
}

function formatSegmentRanges(
  position: SprintContextPosition,
  dateByDay: Map<number, string>,
  partsPerDay: number
): string | null {
  const segments = position.segments;
  if (!segments || segments.length <= 1) {
    return null;
  }
  const ranges = segments.map((segment) => {
    const cells = expandPositionOccupiedCells(
      {
        duration: segment.duration,
        startDay: segment.startDay,
        startPart: segment.startPart,
      },
      partsPerDay
    );
    if (cells.length === 0) {
      return null;
    }
    return formatCellSpan(cells, dateByDay, partsPerDay);
  });
  if (ranges.some((range) => range == null)) {
    return null;
  }
  return ranges.join(' | ');
}

function formatOnePosition(
  position: SprintContextPosition,
  dateByDay: Map<number, string>,
  partsPerDay: number
): string {
  const cells = expandPositionOccupiedCells(position, partsPerDay);
  const assignee = position.assigneeName ?? position.assigneeId;
  if (cells.length === 0) {
    return `${position.taskId}  ${assignee}  (empty)`;
  }
  const segmented = formatSegmentRanges(position, dateByDay, partsPerDay);
  const span = segmented ?? formatCellSpan(cells, dateByDay, partsPerDay);
  return `${position.taskId}  ${assignee}  ${span}  ${formatDurationDays(cells.length, partsPerDay)}`;
}

/** Human-readable calendar layout for proposed/applied positions. */
export function formatSprintPlanSchedule(
  positions: SprintContextPosition[],
  calendarDays: SprintContextCalendarDay[],
  partsPerDay: number
): string[] {
  const grid = resolvePartsPerDay(partsPerDay);
  const dateByDay = dateByDayMap(calendarDays);
  const sorted = [...positions].sort((left, right) => {
    if (left.startDay !== right.startDay) {
      return left.startDay - right.startDay;
    }
    if (left.startPart !== right.startPart) {
      return left.startPart - right.startPart;
    }
    return left.taskId.localeCompare(right.taskId);
  });
  return sorted.map((position) => formatOnePosition(position, dateByDay, grid));
}

/** Schedule lines only for taskIds touched by upsertPosition ops. */
export function formatSprintPlanScheduleForTaskIds(
  positions: SprintContextPosition[],
  calendarDays: SprintContextCalendarDay[],
  partsPerDay: number,
  taskIds: ReadonlySet<string>
): string[] {
  return formatSprintPlanSchedule(
    positions.filter((position) => taskIds.has(position.taskId)),
    calendarDays,
    partsPerDay
  );
}

export function collectUpsertPositionTaskIds(
  ops: Array<{ op: string; taskId?: string }>
): Set<string> {
  const ids = new Set<string>();
  for (const op of ops) {
    if (op.op === 'upsertPosition' && typeof op.taskId === 'string') {
      ids.add(op.taskId);
    }
  }
  return ids;
}

/** Task ids touched by upsertPosition or deletePosition. */
export function collectPositionPatchTaskIds(
  ops: Array<{ op: string; taskId?: string }>
): Set<string> {
  const ids = new Set<string>();
  for (const op of ops) {
    if (
      (op.op === 'upsertPosition' || op.op === 'deletePosition') &&
      typeof op.taskId === 'string'
    ) {
      ids.add(op.taskId);
    }
  }
  return ids;
}
