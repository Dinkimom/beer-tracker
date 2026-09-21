const CONTEXT_MENU_VIEWPORT_PAD_PX = 8;
const CONTEXT_MENU_ANCHOR_GAP_PX = 8;

/** С какой стороны якоря стоит меню: кнопки шапки прижимаем к карточке. */
export type ContextMenuAnchorSide = 'left' | 'right';

/**
 * Размер меню без CSS transform.
 * Enter-анимация `.overlay-panel` делает `scale(0.96)` — `getBoundingClientRect`
 * тогда занижает ширину, и при flip слева меню прилипает к карточке (съедает gap).
 */
export function measureContextMenuLayoutSize(el: HTMLElement): { height: number; width: number } {
  return { height: el.offsetHeight, width: el.offsetWidth };
}

/**
 * DOM id полосы на свимлейне (`.task-bar-item`), чтобы меню следовало за шириной карточки.
 * Для occupancy/kanban якоря без id возвращает undefined — остаётся snapshot rect.
 */
export function resolveContextMenuFollowAnchorId(anchoredEl: HTMLElement | null): string | undefined {
  const taskBarRoot = anchoredEl?.closest<HTMLElement>('[data-draggable-id][data-task-id]');
  const id = taskBarRoot?.id?.trim();
  return id || undefined;
}

export function resolveContextMenuQuickActionsAlignClass(
  anchorSide: ContextMenuAnchorSide
): 'justify-end' | 'justify-start' {
  return anchorSide === 'left' ? 'justify-end' : 'justify-start';
}

export function resolveContextMenuViewportPosition(input: {
  anchorRect?: Pick<DOMRect, 'left' | 'right' | 'top'> | null;
  menuHeight: number;
  menuWidth: number;
  position: { x: number; y: number };
  viewportHeight: number;
  viewportWidth: number;
}): { anchorSide: ContextMenuAnchorSide; left: number; top: number } {
  let left: number;
  let top: number;
  let anchorSide: ContextMenuAnchorSide = 'right';

  if (input.anchorRect) {
    left = input.anchorRect.right + CONTEXT_MENU_ANCHOR_GAP_PX;
    top = input.anchorRect.top;
    if (left + input.menuWidth > input.viewportWidth - CONTEXT_MENU_VIEWPORT_PAD_PX) {
      const leftOfCard = input.anchorRect.left - input.menuWidth - CONTEXT_MENU_ANCHOR_GAP_PX;
      if (leftOfCard >= CONTEXT_MENU_VIEWPORT_PAD_PX) {
        left = leftOfCard;
        anchorSide = 'left';
      }
    }
  } else {
    left = input.position.x;
    top = input.position.y;
  }

  if (left + input.menuWidth > input.viewportWidth - CONTEXT_MENU_VIEWPORT_PAD_PX) {
    left = input.viewportWidth - input.menuWidth - CONTEXT_MENU_VIEWPORT_PAD_PX;
  }
  if (top + input.menuHeight > input.viewportHeight - CONTEXT_MENU_VIEWPORT_PAD_PX) {
    top = input.viewportHeight - input.menuHeight - CONTEXT_MENU_VIEWPORT_PAD_PX;
  }
  if (left < CONTEXT_MENU_VIEWPORT_PAD_PX) {
    left = CONTEXT_MENU_VIEWPORT_PAD_PX;
  }
  if (top < CONTEXT_MENU_VIEWPORT_PAD_PX) {
    top = CONTEXT_MENU_VIEWPORT_PAD_PX;
  }

  return { anchorSide, left, top };
}
