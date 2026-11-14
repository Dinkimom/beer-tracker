import type {
  QuarterlyPlanAssignment,
  QuarterlyPlanContent,
  QuarterlyPlanDirection,
  QuarterlyPlanEpic,
  QuarterlyPlanLink,
  QuarterlyPlanNote,
  QuarterlyPlanNoteRow,
} from './quarterlyPlanTypes';

import { QUARTER_WORKING_DAYS_PER_WEEK } from './quarterWeeks';

export interface WeekSpan {
  startWeek: number;
  weeks: number;
}

export type BarDragMode = 'end' | 'move' | 'start';

/** Полоса после сдвига или растягивания на `deltaWeeks`: не короче недели и в пределах квартала. */
export function applyBarDrag(
  span: WeekSpan,
  mode: BarDragMode,
  deltaWeeks: number,
  weekCount: number
): WeekSpan {
  const lastWeek = span.startWeek + span.weeks - 1;
  if (mode === 'move') {
    const startWeek = Math.min(Math.max(0, span.startWeek + deltaWeeks), weekCount - span.weeks);
    return { startWeek, weeks: span.weeks };
  }
  if (mode === 'start') {
    const startWeek = Math.min(Math.max(0, span.startWeek + deltaWeeks), lastWeek);
    return { startWeek, weeks: lastWeek - startWeek + 1 };
  }
  const nextLast = Math.min(Math.max(span.startWeek, lastWeek + deltaWeeks), weekCount - 1);
  return { startWeek: span.startWeek, weeks: nextLast - span.startWeek + 1 };
}

/** Дорожки для пересекающихся полос одной строки: каждая полоса — в первую свободную. */
export function assignBarLanes<T extends WeekSpan & { id: string }>(
  bars: readonly T[]
): { laneById: Map<string, number>; laneCount: number } {
  const laneEnds: number[] = [];
  const laneById = new Map<string, number>();
  const sorted = [...bars].sort((a, b) => a.startWeek - b.startWeek || b.weeks - a.weeks);
  for (const bar of sorted) {
    let lane = laneEnds.findIndex((end) => end <= bar.startWeek);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = bar.startWeek + bar.weeks;
    laneById.set(bar.id, lane);
  }
  return { laneById, laneCount: Math.max(1, laneEnds.length) };
}

/** Сколько эпиков приходится на каждую неделю квартала. */
export function buildWeekLoad(
  assignments: readonly QuarterlyPlanAssignment[],
  weekCount: number
): number[] {
  const load = new Array<number>(weekCount).fill(0);
  for (const assignment of assignments) {
    const end = Math.min(weekCount, assignment.startWeek + assignment.weeks);
    for (let week = Math.max(0, assignment.startWeek); week < end; week += 1) {
      load[week]! += 1;
    }
  }
  return load;
}

/** Рабочие дни назначения (индексы от начала квартала), в которые человек отсутствует. */
export function absentDaysWithinSpan(span: WeekSpan, absentDays: ReadonlySet<number>): number[] {
  const firstDay = span.startWeek * QUARTER_WORKING_DAYS_PER_WEEK;
  const dayCount = span.weeks * QUARTER_WORKING_DAYS_PER_WEEK;
  const days: number[] = [];
  for (let day = firstDay; day < firstDay + dayCount; day += 1) {
    if (absentDays.has(day)) days.push(day);
  }
  return days;
}

/** Подряд идущие дни — отрезками, чтобы рисовать штриховку одним блоком. */
export function groupConsecutiveDays(days: readonly number[]): Array<{ dayCount: number; startDay: number }> {
  const ranges: Array<{ dayCount: number; startDay: number }> = [];
  for (const day of days) {
    const last = ranges[ranges.length - 1];
    if (last && last.startDay + last.dayCount === day) {
      last.dayCount += 1;
    } else {
      ranges.push({ dayCount: 1, startDay: day });
    }
  }
  return ranges;
}

export function updateAssignment(
  plan: QuarterlyPlanContent,
  assignmentId: string,
  patch: Partial<Omit<QuarterlyPlanAssignment, 'id'>>
): QuarterlyPlanContent {
  return {
    ...plan,
    assignments: plan.assignments.map((assignment) =>
      assignment.id === assignmentId ? { ...assignment, ...patch } : assignment
    ),
  };
}

export function addAssignment(
  plan: QuarterlyPlanContent,
  assignment: QuarterlyPlanAssignment
): QuarterlyPlanContent {
  return { ...plan, assignments: [...plan.assignments, assignment] };
}

/** Убирает назначения вместе с зависимостями, в которых они участвуют. */
function dropAssignments(
  plan: QuarterlyPlanContent,
  isRemoved: (assignment: QuarterlyPlanAssignment) => boolean
): QuarterlyPlanContent {
  const removedIds = new Set(plan.assignments.filter(isRemoved).map((assignment) => assignment.id));
  return {
    ...plan,
    assignments: plan.assignments.filter((assignment) => !removedIds.has(assignment.id)),
    links: plan.links.filter((link) => !removedIds.has(link.fromId) && !removedIds.has(link.toId)),
  };
}

export function removeAssignment(plan: QuarterlyPlanContent, assignmentId: string): QuarterlyPlanContent {
  return dropAssignments(plan, (assignment) => assignment.id === assignmentId);
}

/** Между назначениями уже есть зависимость — в любую сторону. */
export function areLinked(links: readonly QuarterlyPlanLink[], a: string, b: string): boolean {
  return links.some(
    (link) => (link.fromId === a && link.toId === b) || (link.fromId === b && link.toId === a)
  );
}

/**
 * Концы новой зависимости. Блокирует то назначение, которое стоит раньше; если сроки пересекаются —
 * то, которое выбрали первым (`source`): пользователь сам назвал, что должно закончиться сначала.
 */
export function orderLinkEnds(
  source: QuarterlyPlanAssignment,
  target: QuarterlyPlanAssignment
): Pick<QuarterlyPlanLink, 'fromId' | 'toId'> {
  return target.startWeek + target.weeks <= source.startWeek
    ? { fromId: target.id, toId: source.id }
    : { fromId: source.id, toId: target.id };
}

/** Добавляет зависимость; вторую между теми же назначениями не ставит. */
export function addLink(plan: QuarterlyPlanContent, link: QuarterlyPlanLink): QuarterlyPlanContent {
  return areLinked(plan.links, link.fromId, link.toId) ? plan : { ...plan, links: [...plan.links, link] };
}

export function removeLink(plan: QuarterlyPlanContent, linkId: string): QuarterlyPlanContent {
  return { ...plan, links: plan.links.filter((link) => link.id !== linkId) };
}

/** Порядок нарушен: зависимое назначение начинается раньше, чем закончится то, которого оно ждёт. */
export function isLinkViolated(from: WeekSpan, to: WeekSpan): boolean {
  return to.startWeek < from.startWeek + from.weeks;
}

/**
 * Назначения, которых ждёт каждое зависимое назначение и которые ещё не закончатся к его началу:
 * ключ — зависимое назначение. Зависимости на пропавшие назначения пропускаются.
 */
export function violatedBlockersByAssignment(
  plan: Pick<QuarterlyPlanContent, 'assignments' | 'links'>
): Map<string, QuarterlyPlanAssignment[]> {
  const byId = new Map(plan.assignments.map((assignment) => [assignment.id, assignment]));
  const result = new Map<string, QuarterlyPlanAssignment[]>();
  for (const link of plan.links) {
    const from = byId.get(link.fromId);
    const to = byId.get(link.toId);
    if (from && to && isLinkViolated(from, to)) {
      result.set(to.id, [...(result.get(to.id) ?? []), from]);
    }
  }
  return result;
}

export function updateEpic(
  plan: QuarterlyPlanContent,
  epicId: string,
  patch: Partial<Omit<QuarterlyPlanEpic, 'id'>>
): QuarterlyPlanContent {
  return {
    ...plan,
    epics: plan.epics.map((epic) => (epic.id === epicId ? { ...epic, ...patch } : epic)),
  };
}

export function addEpic(plan: QuarterlyPlanContent, epic: QuarterlyPlanEpic): QuarterlyPlanContent {
  return { ...plan, epics: [...plan.epics, epic] };
}

export function addDirection(plan: QuarterlyPlanContent, direction: QuarterlyPlanDirection): QuarterlyPlanContent {
  return { ...plan, directions: [...plan.directions, direction] };
}

export function updateDirection(
  plan: QuarterlyPlanContent,
  directionId: string,
  patch: Partial<Omit<QuarterlyPlanDirection, 'id'>>
): QuarterlyPlanContent {
  return {
    ...plan,
    directions: plan.directions.map((direction) => (direction.id === directionId ? { ...direction, ...patch } : direction)),
  };
}

const QUARTER_NOTE_MAX_ROWS = 4;

/** Высота заметки после растягивания на `deltaRows` дорожек. */
export function resizeNoteRows(rows: number, deltaRows: number): number {
  return Math.min(QUARTER_NOTE_MAX_ROWS, Math.max(1, rows + deltaRows));
}

/** То, что уже занимает дорожки строки и не двигается: полосы назначений, плашки отсутствий. */
export interface NoteLaneBlocker extends WeekSpan {
  lane: number;
  rows: number;
}

/**
 * Дорожки для заметок строки. Заметки делят дорожки с тем, что в строке уже стоит (`blockers`):
 * встают рядом, если недели свободны, и уходят ниже, только если заняты. Заметка высотой
 * в несколько дорожек встаёт в первую, от которой все нужные ей свободны на её неделях.
 */
export function assignNoteLanes<T extends WeekSpan & { id: string; rows: number }>(
  notes: readonly T[],
  blockers: readonly NoteLaneBlocker[] = []
): { laneById: Map<string, number>; laneCount: number } {
  /** Для каждой дорожки — занятые в ней отрезки недель. */
  const lanes: WeekSpan[][] = [];
  const occupy = (lane: number, rows: number, span: WeekSpan) => {
    for (let index = lane; index < lane + rows; index += 1) {
      lanes[index] = [...(lanes[index] ?? []), span];
    }
  };
  const isFree = (lane: number, rows: number, note: WeekSpan) =>
    lanes
      .slice(lane, lane + rows)
      .flat()
      .every(
        (taken) => taken.startWeek + taken.weeks <= note.startWeek || note.startWeek + note.weeks <= taken.startWeek
      );
  blockers.forEach((blocker) => occupy(blocker.lane, blocker.rows, blocker));

  const laneById = new Map<string, number>();
  const sorted = [...notes].sort((a, b) => a.startWeek - b.startWeek || b.weeks - a.weeks);
  for (const note of sorted) {
    let lane = 0;
    while (!isFree(lane, note.rows, note)) lane += 1;
    occupy(lane, note.rows, note);
    laneById.set(note.id, lane);
  }
  return { laneById, laneCount: lanes.length };
}

/** Ключ строки доски — для группировки заметок и атрибута строки в разметке. */
export function quarterNoteRowKey(row: QuarterlyPlanNoteRow): string {
  return `${row.kind}:${row.id}`;
}

export function addNote(plan: QuarterlyPlanContent, note: QuarterlyPlanNote): QuarterlyPlanContent {
  return { ...plan, notes: [...plan.notes, note] };
}

export function updateNote(
  plan: QuarterlyPlanContent,
  noteId: string,
  patch: Partial<Omit<QuarterlyPlanNote, 'id'>>
): QuarterlyPlanContent {
  return { ...plan, notes: plan.notes.map((note) => (note.id === noteId ? { ...note, ...patch } : note)) };
}

export function removeNote(plan: QuarterlyPlanContent, noteId: string): QuarterlyPlanContent {
  return { ...plan, notes: plan.notes.filter((note) => note.id !== noteId) };
}

/** Убирает эпики вместе с их назначениями, зависимостями этих назначений и заметками в их строках. */
function removeEpics(plan: QuarterlyPlanContent, epicIds: ReadonlySet<string>): QuarterlyPlanContent {
  return {
    ...dropAssignments(plan, (assignment) => epicIds.has(assignment.epicId)),
    epics: plan.epics.filter((epic) => !epicIds.has(epic.id)),
    notes: plan.notes.filter((note) => !(note.row.kind === 'epic' && epicIds.has(note.row.id))),
  };
}

export function removeEpic(plan: QuarterlyPlanContent, epicId: string): QuarterlyPlanContent {
  return removeEpics(plan, new Set([epicId]));
}

export function removeDirection(plan: QuarterlyPlanContent, directionId: string): QuarterlyPlanContent {
  const epicIds = new Set(plan.epics.filter((epic) => epic.directionId === directionId).map((epic) => epic.id));
  const next = removeEpics(plan, epicIds);
  return {
    ...next,
    directions: next.directions.filter((direction) => direction.id !== directionId),
    notes: next.notes.filter((note) => !(note.row.kind === 'direction' && note.row.id === directionId)),
  };
}

/** Другие назначения того же человека, которые пересекаются с этим по неделям. */
export function overlappingAssignments(
  assignment: QuarterlyPlanAssignment,
  all: readonly QuarterlyPlanAssignment[]
): QuarterlyPlanAssignment[] {
  const end = assignment.startWeek + assignment.weeks;
  return all.filter(
    (other) =>
      other.id !== assignment.id &&
      other.memberId === assignment.memberId &&
      other.startWeek < end &&
      other.startWeek + other.weeks > assignment.startWeek
  );
}

/** Недели назначения, в которые у того же человека стоит ещё одно назначение. */
export function overlapWeeks(
  assignment: QuarterlyPlanAssignment,
  all: readonly QuarterlyPlanAssignment[]
): number[] {
  const others = overlappingAssignments(assignment, all);
  const weeks: number[] = [];
  for (let week = assignment.startWeek; week < assignment.startWeek + assignment.weeks; week += 1) {
    if (others.some((other) => other.startWeek <= week && week < other.startWeek + other.weeks)) {
      weeks.push(week);
    }
  }
  return weeks;
}
