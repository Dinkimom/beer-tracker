/**
 * Вычисление целевой ячейки по событию dnd-kit и DOM.
 */

import type { CellPosition } from './swimlaneDragTypes';
import type { Task, TaskPosition } from '@/types';
import type { DragEndEvent, DragMoveEvent } from '@dnd-kit/core';
import type { MutableRefObject } from 'react';

import { WORKING_DAYS } from '@/constants';
import { parseSwimlaneTaskDraggableId } from '@/lib/swimlane/swimlaneDragIds';
import { readSwimlaneLayerGeometry, swimlaneHoverLayerFromOffset } from '@/lib/swimlane/swimlaneLayerGeometry';

import { extractAssigneeId } from './swimlaneDragCellUtils';
import {
  querySwimlaneElement,
  resolveAssigneeIdFromPointerY,
  resolveTargetCellInSwimlane,
} from './swimlaneDragPositionCalculationHelpers';

/**
 * Вычисляет позицию ячейки из события перетаскивания
 * @param draggableActiveId — id активного элемента dnd-kit (в т.ч. `taskId::segmentIndex`)
 */
export function calculateCellFromDragEvent(
  event: DragEndEvent | DragMoveEvent,
  draggableActiveId: string,
  taskPositions: Map<string, TaskPosition>,
  tasks: Task[],
  mousePositionRef: MutableRefObject<{ x: number; y: number } | null>,
  workingDaysCount: number = WORKING_DAYS,
  options?: { manualLayers?: boolean }
): CellPosition | null {
  const { taskId } = parseSwimlaneTaskDraggableId(draggableActiveId);
  const { over } = event;

  if (!over) {
    return null;
  }

  const overId = over.id as string;

  if (overId === 'sidebar-unassigned') {
    return null;
  }

  const overAssigneeId = extractAssigneeId(overId);
  // Ручная раскладка: строка и ряд — по одной точке карточки, иначе низ строки недостижим.
  const anchorY = options?.manualLayers
    ? resolveDragLayerAnchorY(event, mousePositionRef)
    : mousePositionRef.current?.y;
  const pointerAssigneeId = resolveAssigneeIdFromPointerY(anchorY);
  const assigneeId = pointerAssigneeId ?? overAssigneeId;
  if (!assigneeId) {
    return null;
  }

  const swimlaneElement = querySwimlaneElement(assigneeId);
  if (!swimlaneElement) {
    return null;
  }

  const cell = resolveTargetCellInSwimlane({
    assigneeId,
    draggableActiveId,
    event,
    mousePositionRef,
    overId,
    swimlaneElement,
    taskId,
    taskPositions,
    tasks,
    workingDaysCount,
  });
  if (!cell) {
    return null;
  }
  if (!options?.manualLayers || anchorY == null) {
    return cell;
  }
  const geometry = readSwimlaneLayerGeometry(swimlaneElement);
  if (!geometry) {
    return cell;
  }
  const layer = swimlaneHoverLayerFromOffset(anchorY - swimlaneElement.getBoundingClientRect().top, geometry);
  return { ...cell, layer };
}

/** Половина ряда карточки сверху: у высокой заметки — середина её первого ряда. */
const DRAG_LAYER_ANCHOR_MAX_OFFSET_PX = 36;

/** Точка карточки для ряда и строки: середина первого ряда DragOverlay (или курсор). */
function resolveDragLayerAnchorY(
  event: DragEndEvent | DragMoveEvent,
  mousePositionRef: MutableRefObject<{ x: number; y: number } | null>
): number | undefined {
  const rect = event.active.rect.current?.translated;
  if (rect) {
    return rect.top + Math.min(rect.height / 2, DRAG_LAYER_ANCHOR_MAX_OFFSET_PX);
  }
  return mousePositionRef.current?.y;
}
