import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core';

import {
  getDragOverlayCenterX,
  getPlannerSwimlanesContentRightEdge,
  isAnyClientXInOpenRightSidebar,
} from './swimlaneDragMouseUtils';

interface SidebarDropTargetInput {
  overId?: string | null;
  overlayCenterX?: number | null;
  pointerX?: number | null;
  sidebarOpen: boolean;
  sidebarWidth: number;
  /** Переопределение для тестов; иначе читается из DOM. */
  swimlanesContentRightEdge?: number | null;
  viewportWidth: number;
}

/** Курсор/overlay над правым сайдбаром или collision вернул sidebar-unassigned. */
export function isSidebarDropTargetAtPointer(input: SidebarDropTargetInput): boolean {
  if (input.overId === 'sidebar-unassigned') {
    return input.sidebarOpen;
  }
  if (!input.sidebarOpen || input.sidebarWidth <= 0) {
    return false;
  }
  const viewportWidth = input.viewportWidth;
  if (viewportWidth <= 0) {
    return false;
  }
  return isAnyClientXInOpenRightSidebar(
    [input.pointerX, input.overlayCenterX],
    input.sidebarWidth,
    viewportWidth,
    {
      sidebarOpen: input.sidebarOpen,
      swimlanesContentRightEdge:
        input.swimlanesContentRightEdge ?? getPlannerSwimlanesContentRightEdge(),
    }
  );
}

export function resolveSidebarDropTargetFromDragEvent(
  event: DragEndEvent | DragOverEvent,
  pointerX: number | null | undefined,
  ctx: {
    sidebarOpen: boolean;
    sidebarWidth: number;
    viewportWidth: number;
  } | null
): boolean {
  const viewportWidth =
    (typeof window !== 'undefined' ? window.innerWidth : 0) || ctx?.viewportWidth || 0;
  return isSidebarDropTargetAtPointer({
    overId: event.over?.id != null ? String(event.over.id) : null,
    pointerX,
    overlayCenterX: getDragOverlayCenterX(event),
    sidebarOpen: ctx?.sidebarOpen ?? false,
    sidebarWidth: ctx?.sidebarWidth ?? 0,
    viewportWidth,
  });
}
