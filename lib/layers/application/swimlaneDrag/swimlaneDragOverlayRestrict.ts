import type { ClientRect, Modifier } from '@dnd-kit/core';

import { isActiveDeveloperRowDrag } from '@/lib/swimlane/swimlaneDragIds';

/** Горизонтальные границы таймлайна спринта (без after-sprint rail). */
function getPlannerSwimlanesTimelineBounds(): {
  left: number;
  right: number;
} | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const el = document.querySelector('[data-planner-swimlanes-content]');
  if (!el) {
    return null;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0) {
    return null;
  }
  return { left: rect.left, right: rect.right };
}

/**
 * Держит DragOverlay внутри таймлайна спринта по X (не уезжает в after-sprint / за край).
 * По Y не ограничивает — строки свимлейна переключаются свободно.
 */
export function restrictTransformToTimelineBounds(
  transform: { scaleX: number; scaleY: number; x: number; y: number },
  draggingNodeRect: ClientRect | null,
  bounds: { left: number; right: number } | null
): { scaleX: number; scaleY: number; x: number; y: number } {
  if (!draggingNodeRect || !bounds) {
    return transform;
  }
  let { x } = transform;
  const projectedLeft = draggingNodeRect.left + x;
  if (projectedLeft < bounds.left) {
    x += bounds.left - projectedLeft;
  }
  const rightAfterLeftClamp = draggingNodeRect.left + x + draggingNodeRect.width;
  if (rightAfterLeftClamp > bounds.right) {
    x -= rightAfterLeftClamp - bounds.right;
  }
  return { ...transform, x };
}

function shouldRestrictSwimlaneTaskOverlay(
  active: {
    data?: { current?: { kind?: string; source?: string } | null };
  } | null
): boolean {
  if (active == null || isActiveDeveloperRowDrag(active)) {
    return false;
  }
  // Из сайдбара — свободный превью-оверлей; дроп в таймлайн всё равно клампится по ячейке.
  if (active.data?.current?.source === 'sidebar') {
    return false;
  }
  return true;
}

export function createRestrictSwimlaneDragOverlayModifier(
  getBounds: () => { left: number; right: number } | null = getPlannerSwimlanesTimelineBounds
): Modifier {
  return ({ active, draggingNodeRect, transform }) => {
    if (!shouldRestrictSwimlaneTaskOverlay(active)) {
      return transform;
    }
    return restrictTransformToTimelineBounds(transform, draggingNodeRect, getBounds());
  };
}
