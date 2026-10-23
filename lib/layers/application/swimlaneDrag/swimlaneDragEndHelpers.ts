import type { CellPosition, DragContextRef, SwimlaneDragStateApi } from './swimlaneDragTypes';
import type { Task, TaskPosition } from '@/types';
import type { DragEndEvent } from '@dnd-kit/core';

import { getPartsPerDay } from '@/constants';
import { getPositionEffectiveDuration } from '@/lib/planner-timeline';
import { isOnboardingDemoAssigneeId } from '@/lib/plannerOnboarding/onboardingDemoLane';
import {
  clampSwimlaneStartCell,
  swimlaneCellFromStartCell,
} from '@/lib/swimlane/clampSwimlaneStartCell';
import {
  getOrderedPlanSegments,
  moveSwimlanePlanSegmentToStartCell,
} from '@/lib/swimlane/swimlanePlanSegments';

import { extractAssigneeId, isValidCell } from './swimlaneDragCellUtils';
import { calculateCellFromDragEvent } from './swimlaneDragPositionCalculation';
import { getTaskDuration } from './swimlaneDragTaskDuration';
import { resolveSidebarDropTargetFromDragEvent } from './swimlaneSidebarDropTarget';

function clampFinalCellToDuration(
  day: number,
  part: number,
  durationParts: number,
  totalCells: number
): { day: number; part: number } {
  const partsPerDay = getPartsPerDay();
  const start = clampSwimlaneStartCell(day * partsPerDay + part, durationParts, totalCells);
  return swimlaneCellFromStartCell(start, partsPerDay);
}

function updateExistingMultiSegmentPosition(input: {
  assigneeId: string;
  day: number;
  existing: TaskPosition;
  onPositionUpdate: (taskId: string, position: TaskPosition) => void;
  part: number;
  segmentIndex: number | null | undefined;
  taskId: string;
  totalCells: number;
}): void {
  const { assigneeId, day, existing, onPositionUpdate, part, segmentIndex, taskId, totalCells } =
    input;
  if (assigneeId !== existing.assignee || segmentIndex == null) {
    return;
  }
  const segment = getOrderedPlanSegments(existing)[segmentIndex];
  if (!segment) {
    return;
  }
  const clamped = clampFinalCellToDuration(day, part, segment.duration, totalCells);
  const newStart = clamped.day * getPartsPerDay() + clamped.part;
  const moved = moveSwimlanePlanSegmentToStartCell(existing, segmentIndex, newStart, totalCells);
  if (!moved) {
    return;
  }
  onPositionUpdate(taskId, moved);
}

function updateExistingSingleSegmentPosition(input: {
  assigneeId: string;
  day: number;
  existing: TaskPosition;
  onPositionUpdate: (taskId: string, position: TaskPosition) => void;
  part: number;
  taskId: string;
  totalCells: number;
}): void {
  const { assigneeId, existing, onPositionUpdate, taskId, totalCells } = input;
  const effectiveDuration = getPositionEffectiveDuration(existing);
  const { day, part } = clampFinalCellToDuration(
    input.day,
    input.part,
    effectiveDuration,
    totalCells
  );

  if (existing.segments?.length === 1) {
    const seg = existing.segments[0]!;
    onPositionUpdate(taskId, {
      ...existing,
      assignee: assigneeId,
      startDay: day,
      startPart: part,
      plannedStartDay: day,
      plannedStartPart: part,
      duration: seg.duration,
      plannedDuration: seg.duration,
      segments: [{ ...seg, startDay: day, startPart: part, duration: seg.duration }],
    });
    return;
  }

  onPositionUpdate(taskId, {
    ...existing,
    assignee: assigneeId,
    startDay: day,
    startPart: part,
  });
}

export function applySwimlaneDragEndPositionUpdate(params: {
  finalCell: { assigneeId: string; day: number; part: number };
  onPositionUpdate: (taskId: string, position: TaskPosition) => void;
  segmentIndex: number | null | undefined;
  taskId: string;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  totalCells: number;
}): void {
  const { finalCell, onPositionUpdate, segmentIndex, taskId, taskPositions, tasks, totalCells } =
    params;
  const { assigneeId, day, part } = finalCell;

  const existing = taskPositions.get(taskId);
  if (!existing) {
    const calculatedDuration = getTaskDuration(taskId, taskPositions, tasks);
    const clamped = clampFinalCellToDuration(day, part, calculatedDuration, totalCells);
    onPositionUpdate(taskId, {
      taskId,
      assignee: assigneeId,
      startDay: clamped.day,
      startPart: clamped.part,
      duration: calculatedDuration,
    });
    return;
  }

  const isMultiSegmentSwimlane = existing.segments != null && existing.segments.length > 1;
  if (isMultiSegmentSwimlane) {
    updateExistingMultiSegmentPosition({
      assigneeId,
      day,
      existing,
      onPositionUpdate,
      part,
      segmentIndex,
      taskId,
      totalCells,
    });
    return;
  }

  updateExistingSingleSegmentPosition({
    assigneeId,
    day,
    existing,
    onPositionUpdate,
    part,
    taskId,
    totalCells,
  });
}

export function handleSwimlaneSidebarDrop(input: {
  dragState: SwimlaneDragStateApi;
  onPositionDelete: (taskId: string) => void;
  taskId: string;
  updateXarrow: () => void;
}): void {
  input.onPositionDelete(input.taskId);
  requestAnimationFrame(() => {
    input.updateXarrow();
  });
}

export function handleSwimlaneBacklogDrop(input: {
  activeId: string;
  dragState: SwimlaneDragStateApi;
  event: DragEndEvent;
  onBacklogTaskDrop: (taskId: string, assigneeId: string, day: number, part: number) => void;
  onLaneLayerDrop?: (input: { position: TaskPosition; targetTopLayer: number; taskId: string }) => void;
  overId: string;
  taskId: string;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  updateXarrow: () => void;
  workingDaysCount: number;
}): void {
  const assigneeId = extractAssigneeId(input.overId);
  if (!assigneeId || isOnboardingDemoAssigneeId(assigneeId)) {
    return;
  }

  const cell = calculateCellFromDragEvent(
    input.event,
    input.activeId,
    input.taskPositions,
    input.tasks,
    input.dragState.mousePositionRef,
    input.workingDaysCount,
    { manualLayers: input.dragState.manualLayers }
  );

  if (cell && isValidCell(cell, input.workingDaysCount)) {
    if (cell.layer != null) {
      input.onLaneLayerDrop?.({
        position: {
          assignee: cell.assigneeId,
          duration: getTaskDuration(input.taskId, input.taskPositions, input.tasks),
          startDay: cell.day,
          startPart: cell.part,
          taskId: input.taskId,
        },
        targetTopLayer: cell.layer,
        taskId: input.taskId,
      });
    }
    input.onBacklogTaskDrop(input.taskId, cell.assigneeId, cell.day, cell.part);
  } else {
    input.onBacklogTaskDrop(input.taskId, assigneeId, 0, 0);
  }

  requestAnimationFrame(() => {
    input.updateXarrow();
  });
}

export function resolveSwimlaneDragFinalCell(input: {
  activeId: string;
  dragState: SwimlaneDragStateApi;
  event: DragEndEvent;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  workingDaysCount: number;
}): CellPosition | null {
  const cell = calculateCellFromDragEvent(
    input.event,
    input.activeId,
    input.taskPositions,
    input.tasks,
    input.dragState.mousePositionRef,
    input.workingDaysCount,
    { manualLayers: input.dragState.manualLayers }
  );

  const finalCell =
    input.dragState.hoveredCell && input.dragState.hoveredCell.assigneeId === cell?.assigneeId
      ? input.dragState.hoveredCell
      : cell;

  if (
    !finalCell ||
    isOnboardingDemoAssigneeId(finalCell.assigneeId) ||
    !isValidCell(finalCell, input.workingDaysCount)
  ) {
    return null;
  }
  return finalCell;
}

export function isSwimlaneSidebarDropTarget(
  event: DragEndEvent,
  dragState: SwimlaneDragStateApi,
  dragContextRef?: DragContextRef | null
): boolean {
  const ctx = dragContextRef?.current ?? null;
  return resolveSidebarDropTargetFromDragEvent(
    event,
    dragState.mousePositionRef.current?.x,
    ctx
  );
}
