import type { SprintPlannerContextMenuState } from '@/lib/layers';
import type { SprintPlannerUiStore } from '@/lib/layers/application/mobx/stores/sprintPlannerUiStore';
import type { Task } from '@/types';

import { resolveContextMenuFollowAnchorId } from '@/features/context-menu/utils/resolveContextMenuViewportPosition';
import { isSwimlaneImageTaskId } from '@/features/task/utils/swimlaneImageTask';

const ANCHOR_SOURCES = ['task-card', 'occupancy-phase', 'occupancy-task-row'] as const;

/** Меню у карточки строится от её границ, а не от курсора; иначе — у точки клика. */
function resolveMenuPlacement(startEl: HTMLElement | null, e: React.MouseEvent) {
  const anchoredEl =
    ANCHOR_SOURCES.map((source) => startEl?.closest<HTMLElement>(`[data-context-menu-source="${source}"]`)).find(
      Boolean
    ) ?? startEl;
  const menuSource = anchoredEl?.getAttribute('data-context-menu-source');
  if (!anchoredEl || !ANCHOR_SOURCES.some((source) => source === menuSource)) {
    return { anchoredEl, menuSource, position: { x: e.clientX, y: e.clientY } };
  }
  const r = anchoredEl.getBoundingClientRect();
  const anchorRect: SprintPlannerContextMenuState['anchorRect'] = {
    bottom: r.bottom,
    height: r.height,
    left: r.left,
    right: r.right,
    top: r.top,
    width: r.width,
  };
  return { anchorRect, anchoredEl, menuSource, position: { x: r.right + 8, y: r.top } };
}

/**
 * Открыть меню карточки по правому клику: закрыть окно заметки, отметить карточку и поставить меню
 * у неё. Локальный черновик и фото-черновик меню не открывают. Карточка зовёт это сама — экран
 * обработчик не передаёт.
 */
export function openCardContextMenu(
  ui: Pick<SprintPlannerUiStore, 'overlays' | 'tools'>,
  e: React.MouseEvent,
  task: Task,
  options: { hideRemoveFromPlan?: boolean; isBacklogTask?: boolean } = {}
): void {
  e.preventDefault();
  e.stopPropagation();
  if (task.isLocalTask === true || isSwimlaneImageTaskId(task.id)) {
    return;
  }
  ui.tools.closeNoteComposer();
  ui.overlays.setContextMenuTaskId(task.id);
  const startEl = e.currentTarget as HTMLElement | null;
  const { anchorRect, anchoredEl, menuSource, position } = resolveMenuPlacement(startEl, e);
  // Кнопка «⋯» в строке занятости меню без затемнения соседей.
  const fromRowMenuButton = Boolean(startEl?.closest('[data-occupancy-row-context-menu-trigger="true"]'));
  ui.overlays.setContextMenu({
    anchorElementId: resolveContextMenuFollowAnchorId(anchoredEl ?? null),
    anchorRect,
    dimPeerUi: !(menuSource === 'occupancy-task-row' && fromRowMenuButton),
    hideRemoveFromPlan: options.hideRemoveFromPlan ?? false,
    isBacklogTask: options.isBacklogTask ?? false,
    position,
    task,
  });
}
