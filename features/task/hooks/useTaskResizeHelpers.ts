import type { TaskResizeParams } from './useTaskResize';
import type { TaskPosition } from '@/types';

import { PARTS_PER_DAY } from '@/constants';
import { getMaxDuration, resizeSwimlanePlanSegment } from '@/features/swimlane/utils/positionUtils';

function applyPlanSegmentResize(
  position: TaskPosition,
  params: TaskResizeParams,
  totalCells: number
): TaskPosition | null {
  const newDuration = Math.max(1, params.newDuration);
  const resized = resizeSwimlanePlanSegment(
    position,
    params.planSegmentIndex!,
    newDuration,
    params.newStartCell,
    totalCells
  );
  if (!resized) return null;
  return {
    ...resized,
    plannedDuration: resized.duration,
    plannedStartDay: resized.startDay,
    plannedStartPart: resized.startPart,
  };
}

function applyStandardTaskResize(
  position: TaskPosition,
  params: TaskResizeParams,
  totalCells: number
): TaskPosition {
  const newPosition = { ...position };
  if (newPosition.segments && newPosition.segments.length > 0) {
    newPosition.segments = [];
  }

  if (params.newStartCell !== undefined) {
    const newStartCell = Math.max(0, Math.min(params.newStartCell, totalCells - 1));
    const newDay = Math.floor(newStartCell / PARTS_PER_DAY);
    const newPart = newStartCell % PARTS_PER_DAY;

    newPosition.startDay = newDay;
    newPosition.startPart = newPart;
    newPosition.plannedStartDay = newDay;
    newPosition.plannedStartPart = newPart;
  }

  const maxDuration = getMaxDuration(newPosition, totalCells);
  const newDuration = Math.min(Math.max(1, params.newDuration), maxDuration);

  newPosition.duration = newDuration;
  newPosition.plannedDuration = newDuration;

  return newPosition;
}

export function applyTaskResizePreviewToPositionedTasks<
  T extends { position: TaskPosition; task: { id: string } }
>(
  positionedTasks: T[],
  preview: { duration: number; startCell: number | null; taskId: string } | null,
  totalCells: number
): T[] {
  if (!preview) {
    return positionedTasks;
  }
  return positionedTasks.map((item) => {
    if (item.task.id !== preview.taskId) {
      return item;
    }
    const result = applyTaskResizeToPositions(
      new Map([[item.task.id, item.position]]),
      item.task.id,
      {
        newDuration: preview.duration,
        ...(preview.startCell != null ? { newStartCell: preview.startCell } : {}),
      },
      totalCells
    );
    return {
      ...item,
      position: result.outgoingPosition ?? item.position,
    };
  });
}

export function applyTaskResizeToPositions(
  prev: Map<string, TaskPosition>,
  taskId: string,
  params: TaskResizeParams,
  totalCells: number
): {
  finalDurationForCallback: number | null;
  nextPositions: Map<string, TaskPosition>;
  outgoingPosition: TaskPosition | null;
} {
  const newPositions = new Map(prev);
  const position = newPositions.get(taskId);
  if (!position) {
    return { nextPositions: prev, finalDurationForCallback: null, outgoingPosition: null };
  }

  if (
    params.planSegmentIndex !== undefined &&
    position.segments &&
    position.segments.length > 0
  ) {
    const withPlanned = applyPlanSegmentResize(position, params, totalCells);
    if (!withPlanned) {
      return { nextPositions: prev, finalDurationForCallback: null, outgoingPosition: null };
    }
    newPositions.set(taskId, withPlanned);
    return {
      nextPositions: newPositions,
      finalDurationForCallback: withPlanned.duration,
      outgoingPosition: withPlanned,
    };
  }

  const newPosition = applyStandardTaskResize(position, params, totalCells);
  newPositions.set(taskId, newPosition);
  return {
    nextPositions: newPositions,
    finalDurationForCallback: newPosition.duration,
    outgoingPosition: newPosition,
  };
}
