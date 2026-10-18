import type {
  SprintContextAgendaItem,
  SprintContextCalendarDay,
  SprintContextPosition,
  SprintContextWeekendDay,
} from '@/lib/sprints/sprintContextTypes';

function parseUtcDay(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0, 10));
  if (!match) {
    return null;
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function sprintWindowRange(
  startDate: string | undefined,
  endDate: string | undefined
): { end: Date; start: Date } | null {
  const start = parseUtcDay(startDate);
  const end = parseUtcDay(endDate);
  if (!start || !end || start > end) {
    return null;
  }
  return { end, start };
}

function weekendWeekday(dow: number): SprintContextWeekendDay['weekday'] | null {
  if (dow === 6) {
    return 'saturday';
  }
  if (dow === 0) {
    return 'sunday';
  }
  return null;
}

/** Build working-day index → YYYY-MM-DD for the sprint window (UTC date parts). */
export function buildSprintContextCalendarDays(
  startDate: string | undefined,
  endDate: string | undefined
): SprintContextCalendarDay[] {
  const range = sprintWindowRange(startDate, endDate);
  if (!range) {
    return [];
  }
  const days: SprintContextCalendarDay[] = [];
  let dayIndex = 0;
  const cursor = range.start;
  while (cursor <= range.end) {
    const dow = cursor.getUTCDay();
    if (dow >= 1 && dow <= 5) {
      days.push({ date: cursor.toISOString().slice(0, 10), day: dayIndex });
      dayIndex += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** Saturday and Sunday inside the sprint window. These dates are not planner day indices. */
export function buildSprintContextWeekendDays(
  startDate: string | undefined,
  endDate: string | undefined
): SprintContextWeekendDay[] {
  const range = sprintWindowRange(startDate, endDate);
  if (!range) {
    return [];
  }
  const days: SprintContextWeekendDay[] = [];
  const cursor = range.start;
  while (cursor <= range.end) {
    const weekday = weekendWeekday(cursor.getUTCDay());
    if (weekday) {
      days.push({ date: cursor.toISOString().slice(0, 10), weekday });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function buildSprintContextAgenda(
  positions: SprintContextPosition[],
  calendarDays: SprintContextCalendarDay[]
): SprintContextAgendaItem[] {
  const dateByDay = new Map(calendarDays.map((item) => [item.day, item.date]));
  const items: SprintContextAgendaItem[] = positions.map((position) => {
    const item: SprintContextAgendaItem = {
      assigneeId: position.assigneeId,
      day: position.startDay,
      duration: position.duration,
      isQa: position.isQa,
      part: position.startPart,
      taskId: position.taskId,
    };
    if (position.assigneeName != null) {
      item.assigneeName = position.assigneeName;
    }
    if (position.summary != null) {
      item.summary = position.summary;
    }
    const date = dateByDay.get(position.startDay);
    if (date) {
      item.date = date;
    }
    return item;
  });
  return items.sort((a, b) => {
    if (a.day !== b.day) {
      return a.day - b.day;
    }
    if (a.part !== b.part) {
      return a.part - b.part;
    }
    return a.taskId.localeCompare(b.taskId);
  });
}

export function parseStaffUuidFromAssigneeId(assigneeId: string): string | null {
  const match = /^staff:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(
    assigneeId.trim()
  );
  return match?.[1] ?? null;
}

export function collectSprintContextWarnings(input: {
  emptyPlan: boolean;
  softWarnings: string[];
  unresolvedAssigneeIds: string[];
}): string[] {
  const warnings = [...input.softWarnings];
  if (input.emptyPlan) {
    warnings.push('empty_plan: no positions, notes, links, or goals in Beer Tracker for this sprint');
  }
  if (input.unresolvedAssigneeIds.length > 0) {
    warnings.push(
      `unresolved_assignees: ${input.unresolvedAssigneeIds.slice(0, 8).join(', ')}${
        input.unresolvedAssigneeIds.length > 8 ? ', …' : ''
      }`
    );
  }
  return warnings;
}

/** Prefer board with full dates and name affinity to the query (e.g. "Team 1"). */
export function boardAffinityScore(
  hit: { boardName?: string; endDate: string; startDate: string },
  query: string
): number {
  let score = 0;
  if (hit.startDate.trim() && hit.endDate.trim()) {
    score += 10;
  }
  const board = (hit.boardName ?? '').toLowerCase();
  const q = query.trim().toLowerCase();
  if (!board || !q) {
    return score;
  }
  if (q.includes(board) || board.includes(q)) {
    score += 8;
  }
  for (const token of q.split(/\s+/)) {
    if (token.length >= 2 && board.includes(token)) {
      score += 5;
    }
  }
  return score;
}
