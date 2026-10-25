import type { PhaseSegment, Task } from '@/types';

import { getPartsPerDay } from '@/constants';
import { isPlannerNonTrackerCard } from '@/lib/planner/plannerCardKind';

export const SWIMLANE_BASELINE_DRAG_DIM_OPACITY = 0.3;

export function baselineOpacityDuringDrag(params: {
  activeTaskDuration: number | null;
  assigneeId: string;
  baselineStart: number;
  baselineWidth: number;
  hoveredCell: { assigneeId: string; day: number; part: number } | null;
  isDraggingTask: boolean;
}): number | null {
  const {
    activeTaskDuration,
    assigneeId,
    baselineStart,
    baselineWidth,
    hoveredCell,
    isDraggingTask,
  } = params;
  if (!isDraggingTask || !hoveredCell || !activeTaskDuration) return null;
  if (hoveredCell.assigneeId !== assigneeId) return null;

  const targetStartCell = hoveredCell.day * getPartsPerDay() + hoveredCell.part;
  const targetEndCell = targetStartCell + activeTaskDuration;
  const baselineEndCell = baselineStart + baselineWidth;
  if (baselineStart < targetEndCell && baselineEndCell > targetStartCell) {
    return SWIMLANE_BASELINE_DRAG_DIM_OPACITY;
  }
  return null;
}

export function resolveLinkDimOpacity(
  hoverConnectedTaskIds: Set<string> | null,
  taskId: string
): number {
  const hasHoverConnections = hoverConnectedTaskIds != null && hoverConnectedTaskIds.size > 1;
  return hasHoverConnections && !hoverConnectedTaskIds!.has(taskId) ? 0.5 : 1;
}

export function resolveFactDimOpacity(factHoveredTaskId: string | null, taskId: string): number {
  return factHoveredTaskId != null && taskId !== factHoveredTaskId ? 0.5 : 1;
}

export function resolveSegmentEditDimOpacity(params: {
  onSegmentEditCancel?: () => void;
  onSegmentEditSave?: unknown;
  segmentEditTaskId: string | null;
  taskId: string;
}): number {
  const segmentEditMode =
    params.segmentEditTaskId != null &&
    params.onSegmentEditSave != null &&
    params.onSegmentEditCancel != null;
  return segmentEditMode && params.taskId !== params.segmentEditTaskId ? 0.5 : 1;
}

export function computeSwimlaneOverdueBaselineStripsForSegments(
  task: Task,
  planSegments: PhaseSegment[],
  currentCell: number,
  computeBaselineStretch: (
    task: Task,
    plannedEndCell: number,
    currentCell: number
  ) => { baselineStart: number; baselineWidth: number } | null
): Array<{ baselineStart: number; baselineWidth: number }> {
  if (isPlannerNonTrackerCard(task)) {
    return [];
  }
  const lastSegment = planSegments.at(-1);
  if (lastSegment == null) return [];

  const endCell =
    lastSegment.startDay * getPartsPerDay() + lastSegment.startPart + lastSegment.duration;
  const stretch = computeBaselineStretch(task, endCell, currentCell);
  return stretch ? [stretch] : [];
}
