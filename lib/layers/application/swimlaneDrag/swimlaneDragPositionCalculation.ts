/**
 * Вычисление целевой ячейки по событию dnd-kit и DOM.
 */

import type { CellPosition } from './swimlaneDragTypes';
import type { Task, TaskPosition } from '@/types';
import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import type { MutableRefObject } from 'react';

import { WORKING_DAYS } from '@/constants';
import { parseSwimlaneTaskDraggableId } from '@/lib/swimlane/swimlaneDragIds';

import { extractAssigneeId } from './swimlaneDragCellUtils';
import {
  querySwimlaneElement,
  resolveTargetCellInSwimlane,
} from './swimlaneDragPositionCalculationHelpers';

/**
 * Вычисляет позицию ячейки из события перетаскивания
 * @param draggableActiveId — id активного элемента dnd-kit (в т.ч. `taskId::segmentIndex`)
 */
export function calculateCellFromDragEvent(
  event: DragEndEvent | DragOverEvent,
  draggableActiveId: string,
  taskPositions: Map<string, TaskPosition>,
  tasks: Task[],
  mousePositionRef: MutableRefObject<{ x: number; y: number } | null>,
  workingDaysCount: number = WORKING_DAYS
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

  const assigneeId = extractAssigneeId(overId);
  if (!assigneeId) {
    return null;
  }

  const swimlaneElement = querySwimlaneElement(assigneeId);
  if (!swimlaneElement) {
    return null;
  }

  return resolveTargetCellInSwimlane({
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
}
