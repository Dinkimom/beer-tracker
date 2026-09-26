/**
 * Валидация планирования занятости в таймлайне.
 * Ошибки:
 * 1) Занятость тестирования идёт до или пересекается с занятостью разработки по задаче
 *    (должно быть строго: разработка → возможно интервал → тестирование).
 * 2) Пересечение по исполнителям: один исполнитель занят в один период в разных задачах.
 * 3) Задача назначена на исполнителя в отпуске или техспринте (по данным квартального планирования).
 */

import type { Task, TaskPosition } from '@/types';
import type { BoardAvailabilityEvent, QuarterlyAvailability } from '@/types/quarterly';

import { WORKING_DAYS } from '@/constants';
import { normalizeQuarterlyAvailabilityToBoardEvents } from '@/features/sprint/utils/quarterlyAvailabilityNormalize';
import { type OccupancyErrorReason } from '@/lib/planner-timeline/occupancyErrorMessages';
import { getWorkingDaysRange } from '@/utils/dateUtils';

import { getPositionSegmentRanges } from './occupancyUtils';
import {
  buildAssigneePositionIndex,
  closedTaskIds,
  collectPerformerOverlapDays,
  collectPerformerOverlapDetailsByDay,
  collectPerformerOverlapReasons,
  collectPerformerOverlapTaskIds,
  collectQaDevOverlapDays,
  collectQaDevOverlapDetailsByDay,
  collectQaDevOverlapReasons,
  collectQaDevOverlapTaskIds,
  collectQaWithoutDevDetailsByDay,
  collectQaWithoutDevReasons,
  collectUnavailableAssigneeDays,
  collectUnavailableAssigneeDetailsByDay,
  collectUnavailableAssigneeReasons,
  collectUnavailableAssigneeTaskIds,
  filterPositionsByTasks,
  qaTaskByOriginalId,
  type AssigneeUnavailableDays,
} from './occupancyValidationHelpers';
import {
  addAssigneeOverlaps,
  addRelatedQaDevOverlap,
} from './occupancyValidationOverlap';

export { formatOccupancyErrorTooltip } from '@/lib/planner-timeline/occupancyErrorMessages';

function parseIsoDateOnlyUtc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function dayOverlapsEntry(
  dayDate: Date,
  entry: { endDate: string; startDate: string }
): boolean {
  const dayStart = new Date(dayDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayDate);
  dayEnd.setHours(23, 59, 59, 999);
  const entryStart = parseIsoDateOnlyUtc(entry.startDate);
  entryStart.setHours(0, 0, 0, 0);
  const entryEnd = parseIsoDateOnlyUtc(entry.endDate);
  entryEnd.setHours(23, 59, 59, 999);
  return entryStart.getTime() <= dayEnd.getTime() && entryEnd.getTime() >= dayStart.getTime();
}

/**
 * Строит карту: assigneeId → множество индексов дней (0..9), когда исполнитель недоступен
 * (отпуск, техспринт, больничный, дежурство и т.д. по событиям доски).
 */
export function buildAssigneeUnavailableDays(
  availability:
    | BoardAvailabilityEvent[]
    | QuarterlyAvailability
    | null
    | undefined,
  sprintStartDate: Date,
  workingDaysCount: number = WORKING_DAYS
): AssigneeUnavailableDays {
  const map = new Map<string, Set<number>>();
  const events = Array.isArray(availability)
    ? availability
    : normalizeQuarterlyAvailabilityToBoardEvents(availability);
  if (events.length === 0) return map;
  const count = Math.max(1, workingDaysCount);
  const workingDays = getWorkingDaysRange(sprintStartDate, count);

  const addUnavailableDays = (memberId: string, entry: { endDate: string; startDate: string }) => {
    const days = map.get(memberId) ?? new Set<number>();
    for (let dayIndex = 0; dayIndex < workingDays.length; dayIndex++) {
      if (dayOverlapsEntry(workingDays[dayIndex]!, entry)) {
        days.add(dayIndex);
      }
    }
    map.set(memberId, days);
  };

  events.forEach((e) => addUnavailableDays(e.memberId, e));

  return map;
}

/**
 * Возвращает индексы дней (колонок 0..9), в которых есть ошибки планирования.
 */
export function getOccupancyErrorDays(
  tasks: Task[],
  taskPositions: Map<string, TaskPosition>,
  assigneeUnavailableDays?: AssigneeUnavailableDays
): Set<number> {
  const errorDays = new Set<number>();
  const taskPositionsInSprint = filterPositionsByTasks(tasks, taskPositions);
  const closedIds = closedTaskIds(tasks);
  const qaByOriginalId = qaTaskByOriginalId(tasks);

  collectQaDevOverlapDays({
    closedIds,
    errorDays,
    qaByOriginalId,
    taskPositionsInSprint,
    tasks,
  });

  collectPerformerOverlapDays({
    byAssignee: buildAssigneePositionIndex(taskPositionsInSprint),
    closedIds,
    errorDays,
  });

  if (assigneeUnavailableDays?.size) {
    collectUnavailableAssigneeDays({
      assigneeUnavailableDays,
      closedIds,
      errorDays,
      taskPositionsInSprint,
    });
  }

  return errorDays;
}

/**
 * Возвращает ID задач (position.taskId), у которых фаза занятости участвует в ошибке планирования.
 */
export function getOccupancyErrorTaskIds(
  tasks: Task[],
  taskPositions: Map<string, TaskPosition>,
  assigneeUnavailableDays?: AssigneeUnavailableDays
): Set<string> {
  const errorTaskIds = new Set<string>();
  const taskPositionsInSprint = filterPositionsByTasks(tasks, taskPositions);
  const closedIds = closedTaskIds(tasks);
  const qaByOriginalId = qaTaskByOriginalId(tasks);

  collectQaDevOverlapTaskIds({
    closedIds,
    errorTaskIds,
    qaByOriginalId,
    taskPositionsInSprint,
    tasks,
  });

  collectPerformerOverlapTaskIds({
    byAssignee: buildAssigneePositionIndex(taskPositionsInSprint),
    closedIds,
    errorTaskIds,
  });

  if (assigneeUnavailableDays?.size) {
    collectUnavailableAssigneeTaskIds({
      assigneeUnavailableDays,
      closedIds,
      errorTaskIds,
      taskPositionsInSprint,
    });
  }

  return errorTaskIds;
}

/**
 * Возвращает Set ID задач, которые пересекаются с указанной задачей по занятости.
 */
export function getOverlappingTaskIds(
  taskId: string,
  tasks: Task[],
  taskPositions: Map<string, TaskPosition>
): Set<string> {
  const overlappingTaskIds = new Set<string>();
  const taskPositionsInSprint = filterPositionsByTasks(tasks, taskPositions);
  const closedIds = closedTaskIds(tasks);
  if (closedIds.has(taskId)) return overlappingTaskIds;
  const targetPosition = taskPositionsInSprint.get(taskId);
  if (!targetPosition) return overlappingTaskIds;

  const targetRanges = getPositionSegmentRanges(targetPosition);
  const qaByOriginalId = qaTaskByOriginalId(tasks);

  addAssigneeOverlaps({
    closedIds,
    overlappingTaskIds,
    targetAssignee: targetPosition.assignee,
    targetRanges,
    taskId,
    taskPositionsInSprint,
  });

  const task = tasks.find((t) => t.id === taskId);
  if (task) {
    addRelatedQaDevOverlap({
      closedIds,
      overlappingTaskIds,
      qaByOriginalId,
      targetRanges,
      task,
      taskPositionsInSprint,
    });
  }

  return overlappingTaskIds;
}

/**
 * Возвращает для каждой задачи список причин ошибки (ключи OccupancyErrorReason).
 */
export function getOccupancyErrorReasons(
  tasks: Task[],
  taskPositions: Map<string, TaskPosition>,
  assigneeUnavailableDays?: AssigneeUnavailableDays
): Map<string, OccupancyErrorReason[]> {
  const reasons = new Map<string, OccupancyErrorReason[]>();
  const taskPositionsInSprint = filterPositionsByTasks(tasks, taskPositions);
  const closedIds = closedTaskIds(tasks);
  const qaByOriginalId = qaTaskByOriginalId(tasks);

  const addReason = (taskId: string, reason: OccupancyErrorReason) => {
    if (closedIds.has(taskId)) return;
    const list = reasons.get(taskId) ?? [];
    if (!list.includes(reason)) list.push(reason);
    reasons.set(taskId, list);
  };

  collectQaWithoutDevReasons({ addReason, taskPositionsInSprint, tasks });
  collectQaDevOverlapReasons({
    addReason,
    closedIds,
    qaByOriginalId,
    taskPositionsInSprint,
    tasks,
  });
  collectPerformerOverlapReasons({
    addReason,
    byAssignee: buildAssigneePositionIndex(taskPositionsInSprint),
    closedIds,
  });

  if (assigneeUnavailableDays?.size) {
    collectUnavailableAssigneeReasons({
      addReason,
      assigneeUnavailableDays,
      closedIds,
      taskPositionsInSprint,
    });
  }

  return reasons;
}

export interface DayErrorDetail {
  reasons: OccupancyErrorReason[];
  taskName: string;
}

/**
 * Возвращает по каждому дню (индекс колонки) список проблемных задач и причин.
 */
export function getOccupancyErrorDetailsByDay(
  tasks: Task[],
  taskPositions: Map<string, TaskPosition>,
  assigneeUnavailableDays?: AssigneeUnavailableDays
): Map<number, DayErrorDetail[]> {
  const taskPositionsInSprint = filterPositionsByTasks(tasks, taskPositions);
  const closedIds = closedTaskIds(tasks);
  const taskById = new Map<string, Task>();
  tasks.forEach((t) => taskById.set(t.id, t));
  const qaByOriginalId = qaTaskByOriginalId(tasks);

  const byDay = new Map<number, Map<string, Set<OccupancyErrorReason>>>();

  const add = (dayIndex: number, taskId: string, reason: OccupancyErrorReason) => {
    if (closedIds.has(taskId)) return;
    let dayMap = byDay.get(dayIndex);
    if (!dayMap) {
      dayMap = new Map();
      byDay.set(dayIndex, dayMap);
    }
    let reasons = dayMap.get(taskId);
    if (!reasons) {
      reasons = new Set();
      dayMap.set(taskId, reasons);
    }
    reasons.add(reason);
  };

  collectQaDevOverlapDetailsByDay({
    add,
    closedIds,
    qaByOriginalId,
    taskPositionsInSprint,
    tasks,
  });
  collectPerformerOverlapDetailsByDay({
    add,
    byAssignee: buildAssigneePositionIndex(taskPositionsInSprint),
    closedIds,
  });
  collectQaWithoutDevDetailsByDay({
    add,
    closedIds,
    taskPositionsInSprint,
    tasks,
  });

  if (assigneeUnavailableDays?.size) {
    collectUnavailableAssigneeDetailsByDay({
      add,
      assigneeUnavailableDays,
      closedIds,
      taskPositionsInSprint,
    });
  }

  const result = new Map<number, DayErrorDetail[]>();
  byDay.forEach((dayMap, dayIndex) => {
    const list: DayErrorDetail[] = [];
    dayMap.forEach((reasonsSet, taskId) => {
      const task = taskById.get(taskId);
      const taskName = task?.name ?? taskId;
      list.push({ taskName, reasons: Array.from(reasonsSet) });
    });
    result.set(dayIndex, list);
  });
  return result;
}
