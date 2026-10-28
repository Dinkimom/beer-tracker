import type { Task, TaskPosition } from '@/types';

import { getPartsPerDay } from '@/constants';
import { getPositionSegmentRanges } from '@/lib/planner-timeline/occupancyUtils';

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

/**
 * Порог предупреждения о пересечении по занятости: одновременно больше трёх задач
 * у одного исполнителя на одной ячейке таймлайна.
 */
const PERFORMER_OVERLAP_WARN_MAX_WITHOUT_ALERT = 3;

/**
 * Ячейки, где у исполнителя одновременно занято больше трёх открытых задач.
 */
export function forEachHeavyPerformerOverlapCell(
  positions: AssigneePositionSegment[],
  closedIds: Set<string>,
  onHeavy: (taskIds: ReadonlySet<string>, cell: number) => void,
): void {
  const open = positions.filter((segment) => !closedIds.has(segment.taskId));
  if (open.length <= PERFORMER_OVERLAP_WARN_MAX_WITHOUT_ALERT) {
    return;
  }

  let minCell = Number.POSITIVE_INFINITY;
  let maxCell = Number.NEGATIVE_INFINITY;
  for (const segment of open) {
    minCell = Math.min(minCell, segment.startCell);
    maxCell = Math.max(maxCell, segment.endCell);
  }
  if (!Number.isFinite(minCell) || maxCell <= minCell) {
    return;
  }

  for (let cell = minCell; cell < maxCell; cell++) {
    const covering = new Set<string>();
    for (const segment of open) {
      if (segment.startCell <= cell && cell < segment.endCell) {
        covering.add(segment.taskId);
      }
    }
    if (covering.size > PERFORMER_OVERLAP_WARN_MAX_WITHOUT_ALERT) {
      onHeavy(covering, cell);
    }
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
