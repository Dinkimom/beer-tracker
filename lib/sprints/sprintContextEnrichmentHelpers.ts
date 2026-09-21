import type {
  SprintContextAgendaItem,
  SprintContextCalendarDay,
  SprintContextPosition,
} from '@/lib/sprints/sprintContextTypes';


/** Build working-day index → YYYY-MM-DD for the sprint window (UTC date parts). */
export function buildSprintContextCalendarDays(
  startDate: string | undefined,
  endDate: string | undefined
): SprintContextCalendarDay[] {
  if (!startDate || !endDate) {
    return [];
  }
  const startKey = startDate.slice(0, 10);
  const endKey = endDate.slice(0, 10);
  const startMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startKey);
  const endMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(endKey);
  if (!startMatch || !endMatch) {
    return [];
  }
  const cursor = new Date(Date.UTC(Number(startMatch[1]), Number(startMatch[2]) - 1, Number(startMatch[3])));
  const end = new Date(Date.UTC(Number(endMatch[1]), Number(endMatch[2]) - 1, Number(endMatch[3])));
  if (cursor > end) {
    return [];
  }
  const days: SprintContextCalendarDay[] = [];
  let dayIndex = 0;
  while (cursor <= end) {
    const dow = cursor.getUTCDay();
    if (dow >= 1 && dow <= 5) {
      days.push({ date: cursor.toISOString().slice(0, 10), day: dayIndex });
      dayIndex += 1;
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
