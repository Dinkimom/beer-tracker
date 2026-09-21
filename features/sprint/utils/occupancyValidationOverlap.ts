import type { Task, TaskPosition } from '@/types';

import { getPositionSegmentRanges } from './occupancyUtils';

interface CellRange {
  endCell: number;
  startCell: number;
}

function segmentsOverlap(a: CellRange, b: CellRange): boolean {
  return Math.max(a.startCell, b.startCell) < Math.min(a.endCell, b.endCell);
}

function rangesOverlap(aRanges: CellRange[], bRanges: CellRange[]): boolean {
  return aRanges.some((a) => bRanges.some((b) => segmentsOverlap(a, b)));
}

export function qaTaskByOriginalId(tasks: Task[]): Map<string, Task> {
  const qaByOriginalId = new Map<string, Task>();
  for (const task of tasks) {
    if (task.originalTaskId) {
      qaByOriginalId.set(task.originalTaskId, task);
    }
  }
  return qaByOriginalId;
}

export function addAssigneeOverlaps(params: {
  closedIds: Set<string>;
  overlappingTaskIds: Set<string>;
  targetAssignee: string;
  targetRanges: CellRange[];
  taskId: string;
  taskPositionsInSprint: Map<string, TaskPosition>;
}): void {
  params.taskPositionsInSprint.forEach((pos, otherTaskId) => {
    if (otherTaskId === params.taskId) return;
    if (params.closedIds.has(otherTaskId)) return;
    if (pos.assignee !== params.targetAssignee) return;
    if (rangesOverlap(params.targetRanges, getPositionSegmentRanges(pos))) {
      params.overlappingTaskIds.add(otherTaskId);
    }
  });
}

export function addRelatedQaDevOverlap(params: {
  closedIds: Set<string>;
  overlappingTaskIds: Set<string>;
  qaByOriginalId: Map<string, Task>;
  targetRanges: CellRange[];
  task: Task;
  taskPositionsInSprint: Map<string, TaskPosition>;
}): void {
  const relatedTaskId = params.task.originalTaskId ?? params.qaByOriginalId.get(params.task.id)?.id;
  if (!relatedTaskId || params.closedIds.has(relatedTaskId)) {
    return;
  }
  const relatedPosition = params.taskPositionsInSprint.get(relatedTaskId);
  if (!relatedPosition) {
    return;
  }
  if (rangesOverlap(params.targetRanges, getPositionSegmentRanges(relatedPosition))) {
    params.overlappingTaskIds.add(relatedTaskId);
  }
}
