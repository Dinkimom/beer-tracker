import type { Developer, Task, TaskPosition } from '@/types';

import { WORKING_DAYS, getPartsPerDay } from '@/constants';
import {
  calculateOccupiedIntervals,
  findNextAvailableCell,
} from '@/features/task/utils/autoAssignTasks/utils/intervalUtils';
import { isTaskCompleted } from '@/features/task/utils/taskUtils';
import { storyPointsToTimeslots } from '@/lib/pointsUtils';

function positivePoints(value: number | null | undefined): number | null {
  return value != null && value > 0 ? value : null;
}

function usesTestPointsForPlan(task: Task, storyPoints: number | null): boolean {
  if (task.team === 'QA' || task.testingOnlyByIntegrationRules === true) {
    return true;
  }
  return storyPoints == null && positivePoints(task.testPoints) != null;
}

function durationFromPoints(points: number | null): number | null {
  if (points == null) {
    return null;
  }
  const slots = storyPointsToTimeslots(points);
  return slots > 0 ? slots : null;
}

/**
 * Длительность в частях дня по шкале планера.
 * Есть SP — планируем по ним, даже если TP не задан («?tp»).
 * QA и testing-only берут TP, а если его нет — SP.
 */
export function assigneePlanDuration(task: Task): number | null {
  if (task.isLocalTask || isTaskCompleted(task) || !task.assignee) {
    return null;
  }
  const storyPoints = positivePoints(task.storyPoints);
  const testPoints = positivePoints(task.testPoints);
  if (usesTestPointsForPlan(task, storyPoints)) {
    return durationFromPoints(testPoints ?? storyPoints);
  }
  return durationFromPoints(storyPoints);
}

/**
 * Дорожка свимлейна для задачи.
 * У участника без tracker id дорожка — `staff:…`, а в задаче — id Jira.
 * Тогда совпадает единственный разработчик с тем же именем.
 */
export function resolvePlanLaneId(
  assigneeId: string,
  assigneeName: string | undefined,
  developers: ReadonlyArray<Pick<Developer, 'id' | 'name'>>
): string | null {
  if (developers.some((developer) => developer.id === assigneeId)) {
    return assigneeId;
  }
  const name = assigneeName?.trim().toLocaleLowerCase();
  if (!name) {
    return null;
  }
  const matches = developers.filter(
    (developer) => developer.name.trim().toLocaleLowerCase() === name
  );
  return matches.length === 1 ? matches[0].id : null;
}

export function taskWithPlanDraftFlag(task: Task, draftTaskIds: ReadonlySet<string>): Task {
  if (!draftTaskIds.has(task.id)) {
    return task;
  }
  return task.pendingApproval === true ? task : { ...task, pendingApproval: true };
}

/** Карточки свимлейна читают задачу из map, а не из группировки по исполнителю. */
export function stampPlanDraftTasksMap(
  tasksMap: Map<string, Task>,
  draftTaskIds: ReadonlySet<string> | undefined
): Map<string, Task> {
  if (!draftTaskIds || draftTaskIds.size === 0) {
    return tasksMap;
  }
  const next = new Map(tasksMap);
  for (const taskId of draftTaskIds) {
    const task = next.get(taskId);
    if (task) {
      next.set(taskId, taskWithPlanDraftFlag(task, draftTaskIds));
    }
  }
  return next;
}

export function stampPlanDraftTasks(
  tasks: readonly Task[],
  draftTaskIds: ReadonlySet<string> | undefined
): Task[] {
  if (!draftTaskIds || draftTaskIds.size === 0) {
    return tasks as Task[];
  }
  return tasks.map((task) => taskWithPlanDraftFlag(task, draftTaskIds));
}

export function positionsOmittingIds(
  positions: Map<string, TaskPosition>,
  taskIds: ReadonlySet<string>
): Map<string, TaskPosition> {
  if (taskIds.size === 0) {
    return positions;
  }
  const next = new Map(positions);
  for (const taskId of taskIds) {
    next.delete(taskId);
  }
  return next;
}

/** Место целиком внутри спринта. За штриховку после последнего дня не ставим. */
function planStartCell(
  intervals: { start: number; end: number }[],
  duration: number,
  currentCell: number,
  timelineCellCount: number
): number | null {
  const fitted = findNextAvailableCell(intervals, duration, currentCell, timelineCellCount);
  if (fitted == null || fitted + duration > timelineCellCount) {
    return null;
  }
  return fitted;
}

function positionFromCell(task: Task, assigneeId: string, startCell: number, duration: number): TaskPosition {
  const partsPerDay = getPartsPerDay();
  const startDay = Math.floor(startCell / partsPerDay);
  const startPart = startCell % partsPerDay;
  return {
    assignee: assigneeId,
    duration,
    plannedDuration: duration,
    plannedStartDay: startDay,
    plannedStartPart: startPart,
    startDay,
    startPart,
    taskId: task.id,
  };
}

/**
 * Раскладывает незапланированные задачи выбранных исполнителей
 * в свободные ячейки, не двигая уже сохранённые карточки.
 * Порядок — как в списке (ранг Jira), без пересортировки по приоритету и размеру.
 */
export function buildAssigneePlanDraft(input: {
  assigneeIds: ReadonlySet<string>;
  currentCell: number;
  developers: ReadonlyArray<Pick<Developer, 'id' | 'name'>>;
  existingPositions: Map<string, TaskPosition>;
  tasks: readonly Task[];
  /** Длина таймлайна в ячейках. Карточка должна закончиться не позже этого края. */
  timelineCellCount?: number;
}): TaskPosition[] {
  if (input.assigneeIds.size === 0) {
    return [];
  }
  const candidates = input.tasks.flatMap((task) => {
    const assigneeId = task.assignee;
    if (assigneeId == null || !input.assigneeIds.has(assigneeId) || input.existingPositions.has(task.id)) {
      return [];
    }
    const duration = assigneePlanDuration(task);
    const laneId = resolvePlanLaneId(assigneeId, task.assigneeName, input.developers);
    if (duration == null || laneId == null) {
      return [];
    }
    return [{ duration, laneId, task }];
  });
  const timelineCellCount =
    input.timelineCellCount ?? WORKING_DAYS * getPartsPerDay();
  const occupied = calculateOccupiedIntervals(
    input.existingPositions,
    input.developers.map((developer) => developer.id)
  );
  const placed: TaskPosition[] = [];
  for (const candidate of candidates) {
    const intervals = occupied.get(candidate.laneId) ?? [];
    const startCell = planStartCell(
      intervals,
      candidate.duration,
      input.currentCell,
      timelineCellCount
    );
    if (startCell == null) {
      continue;
    }
    placed.push(positionFromCell(candidate.task, candidate.laneId, startCell, candidate.duration));
    intervals.push({ start: startCell, end: startCell + candidate.duration });
    occupied.set(candidate.laneId, intervals);
  }
  return placed;
}
