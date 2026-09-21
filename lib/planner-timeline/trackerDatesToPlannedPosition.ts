import type { Task, TaskPosition } from '@/types';

import { PARTS_PER_DAY } from '@/constants';
import { getTaskPoints, storyPointsToTimeslots } from '@/lib/pointsUtils';
import { getWorkingDaysRange } from '@/utils/dateUtils';

interface CellRange {
  duration: number;
  startDay: number;
  startPart: number;
}

/** Парсит YYYY-MM-DD (или ISO с датой) в локальную полуночь. */
export function parseTrackerIsoDateOnlyLocal(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) {
    return null;
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function workingDayIndexInSprint(
  sprintStartDate: Date,
  day: Date,
  workingDaysCount: number
): number {
  const targetMs = day.getTime();
  const range = getWorkingDaysRange(sprintStartDate, Math.max(1, workingDaysCount));
  for (let i = 0; i < range.length; i++) {
    const candidate = new Date(range[i]!);
    candidate.setHours(0, 0, 0, 0);
    if (candidate.getTime() === targetMs) {
      return i;
    }
  }
  return -1;
}

function estimateDurationSlots(task: Pick<Task, 'storyPoints' | 'team' | 'testPoints'>): number {
  return Math.max(1, storyPointsToTimeslots(getTaskPoints(task)));
}

function dayIndexOrMinusOne(
  date: Date | null,
  sprintStartDate: Date,
  workingDaysCount: number
): number {
  if (!date) {
    return -1;
  }
  return workingDayIndexInSprint(sprintStartDate, date, workingDaysCount);
}

function rangeFromStartAndDeadline(startDayIndex: number, deadlineDayIndex: number): CellRange {
  const startCell = startDayIndex * PARTS_PER_DAY;
  const endCell = deadlineDayIndex * PARTS_PER_DAY + PARTS_PER_DAY;
  if (endCell <= startCell) {
    return { duration: PARTS_PER_DAY, startDay: startDayIndex, startPart: 0 };
  }
  return { duration: endCell - startCell, startDay: startDayIndex, startPart: 0 };
}

function rangeFromSingleBound(input: {
  deadlineDayIndex: number;
  duration: number;
  startDayIndex: number;
}): CellRange {
  if (input.startDayIndex >= 0) {
    return { duration: input.duration, startDay: input.startDayIndex, startPart: 0 };
  }
  const endCell = input.deadlineDayIndex * PARTS_PER_DAY + PARTS_PER_DAY;
  const startCell = Math.max(0, endCell - input.duration);
  return {
    duration: endCell - startCell,
    startDay: Math.floor(startCell / PARTS_PER_DAY),
    startPart: startCell % PARTS_PER_DAY,
  };
}

/**
 * Обратное к `getPlannedCellRangeDateRange`:
 * дата начала → первый таймслот дня, дедлайн → последний таймслот дня.
 * Если задана только одна дата — длительность из оценки (минимум 1 слот).
 */
export function trackerDatesToCellRange(input: {
  deadline?: string | null;
  sprintStartDate: Date;
  start?: string | null;
  task: Pick<Task, 'storyPoints' | 'team' | 'testPoints'>;
  workingDaysCount: number;
}): CellRange | null {
  const startDayIndex = dayIndexOrMinusOne(
    parseTrackerIsoDateOnlyLocal(input.start ?? undefined),
    input.sprintStartDate,
    input.workingDaysCount
  );
  const deadlineDayIndex = dayIndexOrMinusOne(
    parseTrackerIsoDateOnlyLocal(input.deadline ?? undefined),
    input.sprintStartDate,
    input.workingDaysCount
  );
  if (startDayIndex < 0 && deadlineDayIndex < 0) {
    return null;
  }
  if (startDayIndex >= 0 && deadlineDayIndex >= 0) {
    return rangeFromStartAndDeadline(startDayIndex, deadlineDayIndex);
  }
  return rangeFromSingleBound({
    deadlineDayIndex,
    duration: estimateDurationSlots(input.task),
    startDayIndex,
  });
}

export function buildPositionFromTrackerDates(input: {
  assigneeId: string;
  deadline?: string | null;
  sprintStartDate: Date;
  start?: string | null;
  task: Pick<Task, 'id' | 'storyPoints' | 'team' | 'testPoints'>;
  workingDaysCount: number;
}): TaskPosition | null {
  const range = trackerDatesToCellRange({
    deadline: input.deadline,
    sprintStartDate: input.sprintStartDate,
    start: input.start,
    task: input.task,
    workingDaysCount: input.workingDaysCount,
  });
  if (!range) {
    return null;
  }
  return {
    assignee: input.assigneeId,
    duration: range.duration,
    plannedDuration: range.duration,
    plannedStartDay: range.startDay,
    plannedStartPart: range.startPart,
    startDay: range.startDay,
    startPart: range.startPart,
    taskId: input.task.id,
  };
}

function tryDeriveTrackerFallbackPosition(input: {
  dbPositions: Map<string, TaskPosition>;
  sprintStartDate: Date;
  task: Task;
  workingDaysCount: number;
}): TaskPosition | null {
  if (input.dbPositions.has(input.task.id)) {
    return null;
  }
  if (!input.task.start && !input.task.deadline) {
    return null;
  }
  const assigneeId = input.task.assignee || input.task.qaEngineer;
  if (!assigneeId) {
    return null;
  }
  return buildPositionFromTrackerDates({
    assigneeId,
    deadline: input.task.deadline,
    sprintStartDate: input.sprintStartDate,
    start: input.task.start,
    task: input.task,
    workingDaysCount: input.workingDaysCount,
  });
}

/**
 * Позиции из БД имеют приоритет. Для задач без позиции в БД, но с start/deadline в трекере,
 * добавляем отображаемую позицию (первый/последний таймслот дня).
 * Если fallback не нужен — возвращает тот же `dbPositions` (стабильная ссылка).
 */
export function mergeDbPositionsWithTrackerDateFallbacks(input: {
  dbPositions: Map<string, TaskPosition>;
  sprintStartDate: Date;
  tasks: Task[];
  workingDaysCount: number;
}): Map<string, TaskPosition> {
  let result: Map<string, TaskPosition> | null = null;
  for (const task of input.tasks) {
    const derived = tryDeriveTrackerFallbackPosition({
      dbPositions: input.dbPositions,
      sprintStartDate: input.sprintStartDate,
      task,
      workingDaysCount: input.workingDaysCount,
    });
    if (!derived) {
      continue;
    }
    if (!result) {
      result = new Map(input.dbPositions);
    }
    result.set(task.id, derived);
  }
  return result ?? input.dbPositions;
}
