import type { CellPosition } from './swimlaneDragTypes';
import type { Task, TaskPosition } from '@/types';
import type { DragEndEvent, DragMoveEvent } from '@dnd-kit/core';
import type { MutableRefObject } from 'react';

import { calculateCellFromElement, calculateCellFromMouse } from '@/lib/swimlane/swimlaneCellFromGeometry';
import { parseSwimlaneTaskDraggableId } from '@/lib/swimlane/swimlaneDragIds';

import { extractCellFromId, isValidCell } from './swimlaneDragCellUtils';
import { getDragOverlayLeftX, getSwimlanePlacementAnchorX } from './swimlaneDragMouseUtils';
import { getTaskDuration } from './swimlaneDragTaskDuration';

function escapeSelectorAttr(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function querySwimlaneElement(assigneeId: string): HTMLElement | null {
  try {
    return document.querySelector(`[data-swimlane="${assigneeId}"]`) as HTMLElement | null;
  } catch (error) {
    console.warn('Error querying swimlane element:', error);
    return null;
  }
}

/**
 * Полоса под pointer Y по DOM `[data-swimlane]`.
 * Нужна как tie-break, если dnd-kit `over` кратковременно указывает соседнюю строку.
 */
export function resolveAssigneeIdFromPointerY(pointerY: number | null | undefined): string | null {
  if (pointerY == null || typeof document === 'undefined') {
    return null;
  }
  try {
    const lanes = document.querySelectorAll<HTMLElement>('[data-swimlane]');
    for (const lane of lanes) {
      const rect = lane.getBoundingClientRect();
      if (pointerY >= rect.top && pointerY <= rect.bottom) {
        const id = lane.getAttribute('data-swimlane');
        if (id) {
          return id;
        }
      }
    }
  } catch (error) {
    console.warn('Error resolving swimlane from pointer Y:', error);
  }
  return null;
}

function queryActiveDraggableElement(draggableActiveId: string): HTMLElement | null {
  try {
    return document.querySelector(
      `[data-draggable-id="${escapeSelectorAttr(draggableActiveId)}"]`
    ) as HTMLElement | null;
  } catch (error) {
    console.warn('Error querying active element:', error);
    return null;
  }
}

function resolveCellFromOverId(overId: string, workingDaysCount: number): CellPosition | null {
  const cellFromId = extractCellFromId(overId);
  return cellFromId && isValidCell(cellFromId, workingDaysCount) ? cellFromId : null;
}

function tryCellFromMousePosition(
  assigneeId: string,
  swimlaneElement: HTMLElement,
  mouseX: number,
  taskId: string,
  taskPositions: Map<string, TaskPosition>,
  tasks: Task[],
  workingDaysCount: number
): CellPosition | null {
  try {
    const taskDuration = getTaskDuration(taskId, taskPositions, tasks);
    const swimlaneRect = swimlaneElement.getBoundingClientRect();
    const cell = calculateCellFromMouse(
      mouseX,
      swimlaneRect,
      taskDuration,
      swimlaneElement,
      workingDaysCount
    );
    if (cell && isValidCell({ assigneeId, ...cell }, workingDaysCount)) {
      return { assigneeId, ...cell };
    }
  } catch (error) {
    console.warn('Error calculating cell from mouse:', error);
  }
  return null;
}

function tryResolveCellFromActiveElement(
  assigneeId: string,
  swimlaneElement: HTMLElement,
  draggableActiveId: string,
  taskPositions: Map<string, TaskPosition>,
  workingDaysCount: number
): CellPosition | null {
  const isTaskInPositions = taskPositions.has(parseSwimlaneTaskDraggableId(draggableActiveId).taskId);
  const activeElement = queryActiveDraggableElement(draggableActiveId);
  if (!isTaskInPositions || !activeElement || !swimlaneElement.contains(activeElement)) {
    return null;
  }
  try {
    const cardRect = activeElement.getBoundingClientRect();
    const swimlaneRect = swimlaneElement.getBoundingClientRect();
    const cell = calculateCellFromElement(cardRect, swimlaneRect, swimlaneElement, workingDaysCount);
    if (cell && isValidCell({ assigneeId, ...cell }, workingDaysCount)) {
      return { assigneeId, ...cell };
    }
  } catch (error) {
    console.warn('Error calculating cell from element:', error);
  }
  return null;
}

function resolveCellWithoutMouse(
  overId: string,
  isTaskInPositions: boolean,
  isElementInSwimlane: boolean,
  workingDaysCount: number
): CellPosition | null {
  if (!isTaskInPositions && !isElementInSwimlane) {
    return null;
  }
  return resolveCellFromOverId(overId, workingDaysCount);
}

function resolveCellAfterElementFallback(
  overId: string,
  mouseX: number | null,
  isElementInSwimlane: boolean,
  workingDaysCount: number
): CellPosition | null {
  if (mouseX === null || !isElementInSwimlane) {
    return null;
  }
  return resolveCellFromOverId(overId, workingDaysCount);
}

export function resolveTargetCellInSwimlane(input: {
  assigneeId: string;
  draggableActiveId: string;
  event: DragEndEvent | DragMoveEvent;
  mousePositionRef: MutableRefObject<{ x: number; y: number } | null>;
  overId: string;
  swimlaneElement: HTMLElement;
  taskId: string;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  workingDaysCount: number;
}): CellPosition | null {
  const resolvedPrimary = resolvePrimaryCellInSwimlane(input);
  if (resolvedPrimary) {
    return resolvedPrimary;
  }
  return resolveFallbackCellInSwimlane(input);
}

function resolvePointerClientX(
  mousePositionRef: MutableRefObject<{ x: number; y: number } | null>,
  event: DragEndEvent | DragMoveEvent
): number | null {
  if (mousePositionRef.current) {
    return mousePositionRef.current.x;
  }
  if (event.activatorEvent instanceof MouseEvent) {
    return event.activatorEvent.clientX;
  }
  return null;
}

function resolvePrimaryCellInSwimlane(input: {
  assigneeId: string;
  draggableActiveId: string;
  event: DragEndEvent | DragMoveEvent;
  mousePositionRef: MutableRefObject<{ x: number; y: number } | null>;
  swimlaneElement: HTMLElement;
  taskId: string;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  workingDaysCount: number;
}): CellPosition | null {
  // Сначала курсор: превью = ячейка под указателем («наведение на ячейку»).
  const pointerX = resolvePointerClientX(input.mousePositionRef, input.event);
  if (pointerX != null) {
    const fromPointer = tryCellFromMousePosition(
      input.assigneeId,
      input.swimlaneElement,
      pointerX,
      input.taskId,
      input.taskPositions,
      input.tasks,
      input.workingDaysCount
    );
    if (fromPointer) {
      return fromPointer;
    }
  }

  // Fallback: левый край overlay (клик без move / нет mousePositionRef).
  const overlayLeft = getDragOverlayLeftX(input.event);
  if (overlayLeft != null) {
    const fromOverlay = tryCellFromMousePosition(
      input.assigneeId,
      input.swimlaneElement,
      overlayLeft,
      input.taskId,
      input.taskPositions,
      input.tasks,
      input.workingDaysCount
    );
    if (fromOverlay) {
      return fromOverlay;
    }
  }

  return tryResolveCellFromActiveElement(
    input.assigneeId,
    input.swimlaneElement,
    input.draggableActiveId,
    input.taskPositions,
    input.workingDaysCount
  );
}

function resolveFallbackCellInSwimlane(input: {
  draggableActiveId: string;
  event: DragEndEvent | DragMoveEvent;
  mousePositionRef: MutableRefObject<{ x: number; y: number } | null>;
  overId: string;
  swimlaneElement: HTMLElement;
  taskId: string;
  taskPositions: Map<string, TaskPosition>;
  workingDaysCount: number;
}): CellPosition | null {
  const anchorX = getSwimlanePlacementAnchorX(input.mousePositionRef, input.event);
  const isTaskInPositions = input.taskPositions.has(input.taskId);
  const activeElement = queryActiveDraggableElement(input.draggableActiveId);
  const isElementInSwimlane = Boolean(
    isTaskInPositions && activeElement && input.swimlaneElement.contains(activeElement)
  );
  if (anchorX === null) {
    return resolveCellWithoutMouse(input.overId, isTaskInPositions, isElementInSwimlane, input.workingDaysCount);
  }
  return resolveCellAfterElementFallback(input.overId, anchorX, isElementInSwimlane, input.workingDaysCount);
}
