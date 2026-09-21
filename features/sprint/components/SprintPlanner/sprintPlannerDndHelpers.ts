/**
 * Общая логика маршрутизации dnd-kit в планере спринта (свимлейн + сайдбар).
 * Используется в `SprintPlannerDndShell`; не дублировать в других обработчиках DnD планера.
 */

import type { BoardViewMode } from '@/hooks/useLocalStorage';
import type { AutoScrollOptions, DragEndEvent } from '@dnd-kit/core';
import type { RefObject } from 'react';

import { isActiveDeveloperRowDrag } from '@/features/swimlane/utils/swimlaneDragIds';
import { isAnySwimlaneViewMode } from '@/hooks/useLocalStorage';

const SWIMLANE_AUTO_SCROLL_THRESHOLD = { x: 0.12, y: 0.12 } as const;

export function resolveSwimlanePlannerAutoScrollOptions(
  viewMode: BoardViewMode,
  scrollContainerRef: RefObject<HTMLDivElement | null>
): AutoScrollOptions | boolean {
  if (!isAnySwimlaneViewMode(viewMode)) {
    return false;
  }

  return {
    enabled: true,
    threshold: SWIMLANE_AUTO_SCROLL_THRESHOLD,
    canScroll: (element) => element === scrollContainerRef.current,
  };
}

/**
 * Перестановка строки разработчика: оба id дропа — `swimlane-${developerId}`.
 */
export function runDeveloperRowDragEndIfApplicable(
  event: DragEndEvent,
  onReorder: (developerId: string, overDeveloperId: string) => void
): void {
  const activeId = event.active.id.toString();
  const overId = event.over?.id?.toString();
  if (overId?.startsWith('swimlane-')) {
    const developerId = activeId.replace('swimlane-', '');
    const overDeveloperId = overId.replace('swimlane-', '');
    onReorder(developerId, overDeveloperId);
  }
}

export { isActiveDeveloperRowDrag };
