import type { DragContextRef, SwimlaneDragStateApi } from './swimlaneDragTypes';
import type { Task, TaskPosition } from '@/types';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';

import { calculateCellFromDragEvent } from './swimlaneDragPositionCalculation';
import { resolveSidebarDropTargetFromDragEvent } from './swimlaneSidebarDropTarget';

export function updateSidebarDropPreview(
  event: DragOverEvent,
  dragState: SwimlaneDragStateApi,
  dragContextRef?: DragContextRef | null
): boolean {
  const ctx = dragContextRef?.current ?? null;
  const targetingSidebar = resolveSidebarDropTargetFromDragEvent(
    event,
    dragState.mousePositionRef.current?.x,
    ctx
  );
  const pointerY = dragState.mousePositionRef.current?.y ?? null;
  dragState.setSidebarDropPreview({
    active: targetingSidebar,
    pointerY: targetingSidebar ? pointerY : null,
  });
  return targetingSidebar;
}

export function applySwimlaneDragOverCell(
  event: DragOverEvent,
  dragState: SwimlaneDragStateApi,
  taskPositions: Map<string, TaskPosition>,
  tasks: Task[],
  workingDaysCount: number
): void {
  const cell = calculateCellFromDragEvent(
    event,
    event.active.id as string,
    taskPositions,
    tasks,
    dragState.mousePositionRef,
    workingDaysCount
  );
  if (!cell) {
    dragState.setHoveredCell(null);
    return;
  }
  dragState.setHoveredCell(cell);
}

export function isSidebarSourcedDragEvent(
  event: DragEndEvent | DragOverEvent | DragStartEvent,
  dragContextRef?: DragContextRef | null
): boolean {
  const fromActive =
    (event.active.data?.current as { source?: string } | undefined)?.source === 'sidebar';
  if (fromActive) {
    return true;
  }
  return dragContextRef?.current?.isDragFromSidebar ?? false;
}
