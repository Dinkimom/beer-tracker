import type { Task, TaskPosition } from '@/types';

import { getPartsPerDay } from '@/constants';

import { getPositionSegmentRanges } from './occupancyUtils';

export interface AssigneePositionSegment {
  endCell: number;
  startCell: number;
  taskId: string;
}

export function cellRangeToDayIndices(startCell: number, endCell: number): Set<number> {
  const days = new Set<number>();
  for (let c = startCell; c < endCell; c++) {
    days.add(Math.floor(c / getPartsPerDay()));
  }
  return days;
}

interface QaDevTaskContext {
  devRanges: ReturnType<typeof getPositionSegmentRanges>;
  devTask: Task;
  qaRanges: ReturnType<typeof getPositionSegmentRanges>;
  qaTask: Task;
}

function resolveQaDevTaskContext(
  task: Task,
  qaByOriginalId: Map<string, Task>,
  taskPositionsInSprint: Map<string, TaskPosition>,
): QaDevTaskContext | null {
  if (task.originalTaskId) {
    return null;
  }
  const qaTask = qaByOriginalId.get(task.id);
  if (!qaTask) {
    return null;
  }
  const devPosition = taskPositionsInSprint.get(task.id);
  const qaPosition = taskPositionsInSprint.get(qaTask.id);
  if (!devPosition || !qaPosition) {
    return null;
  }
  return {
    devTask: task,
    qaTask,
    devRanges: getPositionSegmentRanges(devPosition),
    qaRanges: getPositionSegmentRanges(qaPosition),
  };
}

export function qaDevTimingConflictBounds(
  devRanges: ReturnType<typeof getPositionSegmentRanges>,
  qaRanges: ReturnType<typeof getPositionSegmentRanges>,
): { conflictEnd: number; conflictStart: number } | null {
  const devEnd = devRanges.length > 0 ? Math.max(...devRanges.map((r) => r.endCell)) : 0;
  const qaStart = qaRanges.length > 0 ? Math.min(...qaRanges.map((r) => r.startCell)) : 0;
  if (qaStart >= devEnd) {
    return null;
  }
  return {
    conflictStart: Math.min(...devRanges.map((r) => r.startCell), qaStart),
    conflictEnd: Math.max(...qaRanges.map((r) => r.endCell), devEnd),
  };
}

function isOpenQaDevTimingOverlap(
  closedIds: Set<string>,
  devTaskId: string,
  qaTaskId: string,
  devRanges: ReturnType<typeof getPositionSegmentRanges>,
  qaRanges: ReturnType<typeof getPositionSegmentRanges>,
): boolean {
  if (qaDevTimingConflictBounds(devRanges, qaRanges) == null) {
    return false;
  }
  return !closedIds.has(devTaskId) && !closedIds.has(qaTaskId);
}

export function forEachOpenQaDevOverlap(
  tasks: Task[],
  qaByOriginalId: Map<string, Task>,
  taskPositionsInSprint: Map<string, TaskPosition>,
  closedIds: Set<string>,
  onOverlap: (ctx: QaDevTaskContext) => void,
): void {
  for (const task of tasks) {
    const ctx = resolveQaDevTaskContext(task, qaByOriginalId, taskPositionsInSprint);
    if (!ctx) {
      continue;
    }
    if (!isOpenQaDevTimingOverlap(closedIds, ctx.devTask.id, ctx.qaTask.id, ctx.devRanges, ctx.qaRanges)) {
      continue;
    }
    onOverlap(ctx);
  }
}

function segmentsOverlapCells(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

function shouldSkipOpenSegmentPair(
  a: AssigneePositionSegment,
  b: AssigneePositionSegment,
  closedIds: Set<string>,
): boolean {
  if (a.taskId === b.taskId) {
    return true;
  }
  if (!segmentsOverlapCells(a.startCell, a.endCell, b.startCell, b.endCell)) {
    return true;
  }
  return closedIds.has(a.taskId) || closedIds.has(b.taskId);
}

function forEachOverlappingPairsForSegment(
  positions: AssigneePositionSegment[],
  index: number,
  closedIds: Set<string>,
  onOverlap: (
    a: AssigneePositionSegment,
    b: AssigneePositionSegment,
    overlapStart: number,
    overlapEnd: number,
  ) => void,
): void {
  const a = positions[index]!;
  for (let j = index + 1; j < positions.length; j++) {
    const b = positions[j]!;
    if (shouldSkipOpenSegmentPair(a, b, closedIds)) {
      continue;
    }
    onOverlap(
      a,
      b,
      Math.max(a.startCell, b.startCell),
      Math.min(a.endCell, b.endCell),
    );
  }
}

export function forEachOpenOverlappingSegmentPair(
  positions: AssigneePositionSegment[],
  closedIds: Set<string>,
  onOverlap: (
    a: AssigneePositionSegment,
    b: AssigneePositionSegment,
    overlapStart: number,
    overlapEnd: number,
  ) => void,
): void {
  for (let i = 0; i < positions.length; i++) {
    forEachOverlappingPairsForSegment(positions, i, closedIds, onOverlap);
  }
}

function processUnavailableDaysInRange(
  startCell: number,
  endCell: number,
  unavailable: Set<number>,
  onDay: (dayIndex: number) => void,
  stopOnFirst: boolean,
): boolean {
  const taskDays = cellRangeToDayIndices(startCell, endCell);
  for (const d of taskDays) {
    if (!unavailable.has(d)) {
      continue;
    }
    onDay(d);
    if (stopOnFirst) {
      return true;
    }
  }
  return false;
}

export function forEachUnavailableDayOnTask(
  pos: TaskPosition,
  unavailable: Set<number>,
  onDay: (dayIndex: number) => void,
  stopOnFirst: boolean,
): void {
  const ranges = getPositionSegmentRanges(pos);
  for (const r of ranges) {
    if (processUnavailableDaysInRange(r.startCell, r.endCell, unavailable, onDay, stopOnFirst)) {
      return;
    }
  }
}
