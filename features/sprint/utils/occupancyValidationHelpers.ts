import type { OccupancyErrorReason } from '@/lib/planner-timeline/occupancyErrorMessages';
import type { Task, TaskPosition } from '@/types';

import { isPlannerAnnotationTask } from '@/features/task/utils/swimlaneImageTask';
import { isTaskCompleted } from '@/features/task/utils/taskUtils';

import { getPositionSegmentRanges } from './occupancyUtils';
import {
  cellRangeToDayIndices,
  forEachOpenOverlappingSegmentPair,
  forEachOpenQaDevOverlap,
  forEachUnavailableDayOnTask,
  qaDevTimingConflictBounds,
  type AssigneePositionSegment,
} from './occupancyValidationCollectHelpers';
import { qaTaskByOriginalId } from './occupancyValidationOverlap';


export type AssigneeUnavailableDays = Map<string, Set<number>>;

export function closedTaskIds(tasks: Task[]): Set<string> {
  return new Set(tasks.filter(isTaskCompleted).map((t) => t.id));
}

export function filterPositionsByTasks(
  tasks: Task[],
  taskPositions: Map<string, TaskPosition>,
): Map<string, TaskPosition> {
  const taskIds = new Set(
    tasks.filter((task) => !isPlannerAnnotationTask(task)).map((task) => task.id)
  );
  const filtered = new Map<string, TaskPosition>();
  taskPositions.forEach((pos, taskId) => {
    if (taskIds.has(taskId)) {
      filtered.set(taskId, pos);
    }
  });
  return filtered;
}

export function buildAssigneePositionIndex(
  taskPositionsInSprint: Map<string, TaskPosition>,
): Map<string, AssigneePositionSegment[]> {
  const byAssignee = new Map<string, AssigneePositionSegment[]>();
  taskPositionsInSprint.forEach((pos, taskId) => {
    const ranges = getPositionSegmentRanges(pos);
    const list = byAssignee.get(pos.assignee) ?? [];
    ranges.forEach((r) => list.push({ taskId, startCell: r.startCell, endCell: r.endCell }));
    byAssignee.set(pos.assignee, list);
  });
  return byAssignee;
}

export function collectQaDevOverlapDays(params: {
  closedIds: Set<string>;
  errorDays: Set<number>;
  qaByOriginalId: Map<string, Task>;
  taskPositionsInSprint: Map<string, TaskPosition>;
  tasks: Task[];
}): void {
  const { closedIds, errorDays, qaByOriginalId, taskPositionsInSprint, tasks } = params;
  forEachOpenQaDevOverlap(tasks, qaByOriginalId, taskPositionsInSprint, closedIds, (ctx) => {
    const bounds = qaDevTimingConflictBounds(ctx.devRanges, ctx.qaRanges);
    if (!bounds) return;
    cellRangeToDayIndices(bounds.conflictStart, bounds.conflictEnd).forEach((d) => errorDays.add(d));
  });
}

export function collectQaDevOverlapTaskIds(params: {
  closedIds: Set<string>;
  errorTaskIds: Set<string>;
  qaByOriginalId: Map<string, Task>;
  taskPositionsInSprint: Map<string, TaskPosition>;
  tasks: Task[];
}): void {
  const { closedIds, errorTaskIds, qaByOriginalId, taskPositionsInSprint, tasks } = params;
  forEachOpenQaDevOverlap(tasks, qaByOriginalId, taskPositionsInSprint, closedIds, (ctx) => {
    errorTaskIds.add(ctx.devTask.id);
    errorTaskIds.add(ctx.qaTask.id);
  });
}

export function collectPerformerOverlapDays(params: {
  byAssignee: Map<string, AssigneePositionSegment[]>;
  closedIds: Set<string>;
  errorDays: Set<number>;
}): void {
  const { byAssignee, closedIds, errorDays } = params;
  byAssignee.forEach((positions) => {
    forEachOpenOverlappingSegmentPair(positions, closedIds, (_a, _b, overlapStart, overlapEnd) => {
      cellRangeToDayIndices(overlapStart, overlapEnd).forEach((d) => errorDays.add(d));
    });
  });
}

export function collectPerformerOverlapTaskIds(params: {
  byAssignee: Map<string, AssigneePositionSegment[]>;
  closedIds: Set<string>;
  errorTaskIds: Set<string>;
}): void {
  const { byAssignee, closedIds, errorTaskIds } = params;
  byAssignee.forEach((positions) => {
    forEachOpenOverlappingSegmentPair(positions, closedIds, (a, b) => {
      errorTaskIds.add(a.taskId);
      errorTaskIds.add(b.taskId);
    });
  });
}

export function collectUnavailableAssigneeDays(params: {
  assigneeUnavailableDays: Map<string, Set<number>>;
  closedIds: Set<string>;
  errorDays: Set<number>;
  taskPositionsInSprint: Map<string, TaskPosition>;
}): void {
  const { assigneeUnavailableDays, closedIds, errorDays, taskPositionsInSprint } = params;
  taskPositionsInSprint.forEach((pos, taskId) => {
    if (closedIds.has(taskId)) return;
    const unavailable = assigneeUnavailableDays.get(pos.assignee);
    if (!unavailable?.size) return;
    forEachUnavailableDayOnTask(pos, unavailable, (d) => errorDays.add(d), true);
  });
}

export function collectUnavailableAssigneeTaskIds(params: {
  assigneeUnavailableDays: Map<string, Set<number>>;
  closedIds: Set<string>;
  errorTaskIds: Set<string>;
  taskPositionsInSprint: Map<string, TaskPosition>;
}): void {
  const { assigneeUnavailableDays, closedIds, errorTaskIds, taskPositionsInSprint } = params;
  taskPositionsInSprint.forEach((pos, taskId) => {
    if (closedIds.has(taskId)) return;
    const unavailable = assigneeUnavailableDays.get(pos.assignee);
    if (!unavailable?.size) return;
    forEachUnavailableDayOnTask(pos, unavailable, () => errorTaskIds.add(taskId), true);
  });
}

function addQaWithoutDevReasonForTask(
  task: Task,
  taskPositionsInSprint: Map<string, TaskPosition>,
  addReason: (taskId: string, reason: OccupancyErrorReason) => void,
): void {
  if (!task.originalTaskId) {
    return;
  }
  const devTaskId = task.originalTaskId;
  const hasQaPosition = taskPositionsInSprint.has(task.id);
  const hasDevPosition = taskPositionsInSprint.has(devTaskId);
  if (hasQaPosition && !hasDevPosition) {
    addReason(task.id, 'qa_without_dev');
  }
}

export function collectQaWithoutDevReasons(params: {
  addReason: (taskId: string, reason: OccupancyErrorReason) => void;
  taskPositionsInSprint: Map<string, TaskPosition>;
  tasks: Task[];
}): void {
  const { addReason, taskPositionsInSprint, tasks } = params;
  for (const task of tasks) {
    addQaWithoutDevReasonForTask(task, taskPositionsInSprint, addReason);
  }
}

export function collectQaDevOverlapReasons(params: {
  addReason: (taskId: string, reason: OccupancyErrorReason) => void;
  closedIds: Set<string>;
  qaByOriginalId: Map<string, Task>;
  taskPositionsInSprint: Map<string, TaskPosition>;
  tasks: Task[];
}): void {
  const { addReason, closedIds, qaByOriginalId, taskPositionsInSprint, tasks } = params;
  forEachOpenQaDevOverlap(tasks, qaByOriginalId, taskPositionsInSprint, closedIds, (ctx) => {
    addReason(ctx.devTask.id, 'qa_before_dev');
    addReason(ctx.qaTask.id, 'qa_before_dev');
  });
}

export function collectPerformerOverlapReasons(params: {
  addReason: (taskId: string, reason: OccupancyErrorReason) => void;
  byAssignee: Map<string, AssigneePositionSegment[]>;
  closedIds: Set<string>;
}): void {
  const { addReason, byAssignee, closedIds } = params;
  byAssignee.forEach((positions) => {
    forEachOpenOverlappingSegmentPair(positions, closedIds, (a, b) => {
      addReason(a.taskId, 'performer_overlap');
      addReason(b.taskId, 'performer_overlap');
    });
  });
}

export function collectUnavailableAssigneeReasons(params: {
  addReason: (taskId: string, reason: OccupancyErrorReason) => void;
  assigneeUnavailableDays: Map<string, Set<number>>;
  closedIds: Set<string>;
  taskPositionsInSprint: Map<string, TaskPosition>;
}): void {
  const { addReason, assigneeUnavailableDays, closedIds, taskPositionsInSprint } = params;
  taskPositionsInSprint.forEach((pos, taskId) => {
    if (closedIds.has(taskId)) return;
    const unavailable = assigneeUnavailableDays.get(pos.assignee);
    if (!unavailable?.size) return;
    forEachUnavailableDayOnTask(pos, unavailable, () => addReason(taskId, 'assignee_unavailable'), true);
  });
}

export function collectQaDevOverlapDetailsByDay(params: {
  add: (dayIndex: number, taskId: string, reason: OccupancyErrorReason) => void;
  closedIds: Set<string>;
  qaByOriginalId: Map<string, Task>;
  taskPositionsInSprint: Map<string, TaskPosition>;
  tasks: Task[];
}): void {
  const { add, closedIds, qaByOriginalId, taskPositionsInSprint, tasks } = params;
  forEachOpenQaDevOverlap(tasks, qaByOriginalId, taskPositionsInSprint, closedIds, (ctx) => {
    const bounds = qaDevTimingConflictBounds(ctx.devRanges, ctx.qaRanges);
    if (!bounds) return;
    cellRangeToDayIndices(bounds.conflictStart, bounds.conflictEnd).forEach((d) => {
      add(d, ctx.devTask.id, 'qa_before_dev');
      add(d, ctx.qaTask.id, 'qa_before_dev');
    });
  });
}

export function collectPerformerOverlapDetailsByDay(params: {
  add: (dayIndex: number, taskId: string, reason: OccupancyErrorReason) => void;
  byAssignee: Map<string, AssigneePositionSegment[]>;
  closedIds: Set<string>;
}): void {
  const { add, byAssignee, closedIds } = params;
  byAssignee.forEach((positions) => {
    forEachOpenOverlappingSegmentPair(positions, closedIds, (a, b, overlapStart, overlapEnd) => {
      cellRangeToDayIndices(overlapStart, overlapEnd).forEach((d) => {
        add(d, a.taskId, 'performer_overlap');
        add(d, b.taskId, 'performer_overlap');
      });
    });
  });
}

function addQaWithoutDevDaysForTask(
  task: Task,
  closedIds: Set<string>,
  taskPositionsInSprint: Map<string, TaskPosition>,
  add: (dayIndex: number, taskId: string, reason: OccupancyErrorReason) => void,
): void {
  if (!task.originalTaskId) return;
  const devTaskId = task.originalTaskId;
  const hasQaPosition = taskPositionsInSprint.has(task.id);
  const hasDevPosition = taskPositionsInSprint.has(devTaskId);
  if (!hasQaPosition || hasDevPosition) return;
  if (closedIds.has(task.id)) return;
  const pos = taskPositionsInSprint.get(task.id)!;
  const ranges = getPositionSegmentRanges(pos);
  ranges.forEach((r) => {
    cellRangeToDayIndices(r.startCell, r.endCell).forEach((d) => add(d, task.id, 'qa_without_dev'));
  });
}

export function collectQaWithoutDevDetailsByDay(params: {
  add: (dayIndex: number, taskId: string, reason: OccupancyErrorReason) => void;
  closedIds: Set<string>;
  taskPositionsInSprint: Map<string, TaskPosition>;
  tasks: Task[];
}): void {
  const { add, closedIds, taskPositionsInSprint, tasks } = params;
  for (const task of tasks) {
    addQaWithoutDevDaysForTask(task, closedIds, taskPositionsInSprint, add);
  }
}

export function collectUnavailableAssigneeDetailsByDay(params: {
  add: (dayIndex: number, taskId: string, reason: OccupancyErrorReason) => void;
  assigneeUnavailableDays: Map<string, Set<number>>;
  closedIds: Set<string>;
  taskPositionsInSprint: Map<string, TaskPosition>;
}): void {
  const { add, assigneeUnavailableDays, closedIds, taskPositionsInSprint } = params;
  taskPositionsInSprint.forEach((pos, taskId) => {
    if (closedIds.has(taskId)) return;
    const unavailable = assigneeUnavailableDays.get(pos.assignee);
    if (!unavailable?.size) return;
    forEachUnavailableDayOnTask(pos, unavailable, (d) => add(d, taskId, 'assignee_unavailable'), false);
  });
}

export { qaTaskByOriginalId };
