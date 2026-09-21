import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import type { MutableRefObject } from 'react';

interface RightSidebarDropBandOptions {
  sidebarOpen?: boolean;
  /** Правый край `[data-planner-swimlanes-content]` — layout gap между таймлайном и сайдбаром. */
  swimlanesContentRightEdge?: number | null;
}

/** Правый край контента свимлейнов в viewport (для drop в «мертвую зону» перед сайдбаром). */
export function getPlannerSwimlanesContentRightEdge(): number | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const el = document.querySelector('[data-planner-swimlanes-content]');
  if (!el) {
    return null;
  }
  return el.getBoundingClientRect().right;
}

/** Сайдбар планера закреплён справа — дроп «в сайдбар» по clientX, а не по левому краю. */
export function isClientXInOpenRightSidebar(
  clientX: number,
  sidebarWidth: number,
  viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0,
  options?: RightSidebarDropBandOptions
): boolean {
  if (sidebarWidth <= 0 || viewportWidth <= 0) {
    return false;
  }
  if (clientX >= viewportWidth - sidebarWidth) {
    return true;
  }
  const { sidebarOpen = true, swimlanesContentRightEdge } = options ?? {};
  if (
    sidebarOpen &&
    swimlanesContentRightEdge != null &&
    clientX >= swimlanesContentRightEdge
  ) {
    return true;
  }
  return false;
}

export function isAnyClientXInOpenRightSidebar(
  clientXs: Array<number | null | undefined>,
  sidebarWidth: number,
  viewportWidth: number,
  options?: RightSidebarDropBandOptions
): boolean {
  return clientXs.some(
    (x) => x != null && isClientXInOpenRightSidebar(x, sidebarWidth, viewportWidth, options)
  );
}

/** Центр DragOverlay на момент dragOver/dragEnd (точнее ref на mouseup). */
export function getDragOverlayCenterX(event: DragEndEvent | DragOverEvent): number | null {
  const translated = event.active.rect.current?.translated;
  if (!translated) {
    return null;
  }
  return translated.left + translated.width / 2;
}

/** Левый край DragOverlay / перетаскиваемой карточки (якорь привязки к сетке). */
export function getDragOverlayLeftX(event: DragEndEvent | DragOverEvent): number | null {
  const translated = event.active.rect.current?.translated;
  if (translated) {
    return translated.left;
  }
  const initial = event.active.rect.current?.initial;
  return initial?.left ?? null;
}

/**
 * Горизонтальный якорь для расчёта целевой ячейки на свимлейне.
 * Сетка выравнивается по левому краю карточки, а не по курсору или центру overlay.
 */
export function getSwimlanePlacementAnchorX(
  mousePositionRef: MutableRefObject<{ x: number; y: number } | null>,
  event?: DragEndEvent | DragOverEvent
): number | null {
  const overlayLeft = event ? getDragOverlayLeftX(event) : null;
  if (overlayLeft != null) {
    return overlayLeft;
  }

  if (mousePositionRef.current) {
    return mousePositionRef.current.x;
  }

  if (event?.activatorEvent instanceof MouseEvent) {
    return event.activatorEvent.clientX;
  }

  if (event?.over?.rect) {
    return event.over.rect.left;
  }

  return null;
}
