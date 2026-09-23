import type { DragContextRef, SwimlaneDragStateApi } from './swimlaneDragTypes';
import type { Task, TaskPosition } from '@/types';
import type { DragEndEvent } from '@dnd-kit/core';

import { getPartsPerDay } from '@/constants';
import { getPositionEffectiveDuration } from '@/lib/planner-timeline';
import { moveSwimlanePlanSegmentToStartCell } from '@/lib/swimlane/swimlanePlanSegments';

import { extractAssigneeId, isValidCell } from './swimlaneDragCellUtils';
import { calculateCellFromDragEvent } from './swimlaneDragPositionCalculation';
import { getTaskDuration } from './swimlaneDragTaskDuration';
import { resolveSidebarDropTargetFromDragEvent } from './swimlaneSidebarDropTarget';

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
  const newStart = day * getPartsPerDay() + part;
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
  const { assigneeId, day, existing, onPositionUpdate, part, taskId, totalCells } = input;
  const newStart = day * getPartsPerDay() + part;
  const effectiveDuration = getPositionEffectiveDuration(existing);
  const maxStart = totalCells - effectiveDuration;
  if (newStart > maxStart) {
    return;
  }

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
    onPositionUpdate(taskId, {
      taskId,
      assignee: assigneeId,
      startDay: day,
      startPart: part,
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
  overId: string;
  taskId: string;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  updateXarrow: () => void;
  workingDaysCount: number;
}): void {
  const assigneeId = extractAssigneeId(input.overId);
  if (!assigneeId) {
    return;
  }

  const cell = calculateCellFromDragEvent(
    input.event,
    input.activeId,
    input.taskPositions,
    input.tasks,
    input.dragState.mousePositionRef,
    input.workingDaysCount
  );

  if (cell && isValidCell(cell, input.workingDaysCount)) {
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
}): { assigneeId: string; day: number; part: number } | null {
  const cell = calculateCellFromDragEvent(
    input.event,
    input.activeId,
    input.taskPositions,
    input.tasks,
    input.dragState.mousePositionRef,
    input.workingDaysCount
  );

  const finalCell =
    input.dragState.hoveredCell && input.dragState.hoveredCell.assigneeId === cell?.assigneeId
      ? input.dragState.hoveredCell
      : cell;

  if (!finalCell || !isValidCell(finalCell, input.workingDaysCount)) {
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
