'use client';

import { useCallback, useEffect, useState } from 'react';

/** Минимальная ширина меню quick-add (не привязана к ширине драфтовой карточки). */
export const QUICK_ADD_MENU_MIN_WIDTH_PX = 520;

/** Компактный список типов добавления, как контекстное меню. */
export const QUICK_ADD_KIND_PICKER_WIDTH_PX = 260;

/** Оценка высоты попапа: снизу показываем, если столько места есть, иначе сверху. */
const QUICK_ADD_MENU_HEIGHT_ESTIMATE_PX = 220;

const PANEL_GAP_PX = 6;
const VIEWPORT_MARGIN_PX = 8;

/**
 * Отслеживает getBoundingClientRect якоря на каждом кадре, пока enabled.
 * Нужно для меню, следующего за драфтовой карточкой при drag/resize/scroll.
 */
export function useFollowAnchorRect(
  getAnchor: () => HTMLElement | null,
  enabled: boolean
): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let raf = 0;
    const tick = () => {
      const el = getAnchor();
      if (el) {
        const next = el.getBoundingClientRect();
        setRect((prev) => {
          if (
            prev &&
            prev.left === next.left &&
            prev.top === next.top &&
            prev.width === next.width &&
            prev.height === next.height
          ) {
            return prev;
          }
          return next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onLayout = () => {
      const el = getAnchor();
      if (el) {
        const next = el.getBoundingClientRect();
        setRect((prev) => {
          if (
            prev &&
            prev.left === next.left &&
            prev.top === next.top &&
            prev.width === next.width &&
            prev.height === next.height
          ) {
            return prev;
          }
          return next;
        });
      }
    };
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [enabled, getAnchor]);

  return rect;
}

/** Следит за элементом по id — для меню, которое должно ехать за карточкой при анимации ширины. */
export function useFollowAnchorRectByElementId(elementId: string | null | undefined): DOMRect | null {
  const getAnchor = useCallback(
    () => (elementId ? document.getElementById(elementId) : null),
    [elementId]
  );
  return useFollowAnchorRect(getAnchor, Boolean(elementId));
}

type QuickAddMenuPlacement = 'above' | 'below';

export function resolveQuickAddPopoverCollision(
  anchorRect: Pick<DOMRect, 'bottom' | 'top'>,
  viewportHeight: number,
  minHeight = QUICK_ADD_MENU_HEIGHT_ESTIMATE_PX
): { maxHeight: number; side: 'bottom' | 'top' } {
  const spaceAbove = anchorRect.top - VIEWPORT_MARGIN_PX - PANEL_GAP_PX;
  const spaceBelow = viewportHeight - anchorRect.bottom - VIEWPORT_MARGIN_PX - PANEL_GAP_PX;
  const fitsBelow = spaceBelow >= minHeight;
  if (fitsBelow || spaceBelow >= spaceAbove) {
    return { maxHeight: Math.max(0, spaceBelow), side: 'bottom' };
  }
  return { maxHeight: Math.max(0, spaceAbove), side: 'top' };
}

export function computeAnchoredPanelPosition(
  anchorRect: DOMRect,
  options?: { minWidth?: number; panelHeightEstimate?: number }
): { left: number; placement: QuickAddMenuPlacement; top: number; width: number } {
  const width = options?.minWidth ?? QUICK_ADD_MENU_MIN_WIDTH_PX;
  const panelHeightEstimate = options?.panelHeightEstimate ?? QUICK_ADD_MENU_HEIGHT_ESTIMATE_PX;

  const left = Math.min(
    window.innerWidth - width - VIEWPORT_MARGIN_PX,
    Math.max(VIEWPORT_MARGIN_PX, anchorRect.left)
  );

  const belowTop = anchorRect.bottom + PANEL_GAP_PX;
  const aboveTop = anchorRect.top - PANEL_GAP_PX - panelHeightEstimate;
  const fitsBelow = belowTop + panelHeightEstimate <= window.innerHeight - VIEWPORT_MARGIN_PX;
  const placement: QuickAddMenuPlacement = fitsBelow ? 'below' : 'above';
  const top =
    placement === 'below'
      ? belowTop
      : Math.max(VIEWPORT_MARGIN_PX, aboveTop);

  return { left, top, width, placement };
}

/** Горизонтальная позиция «хвостика» попапа относительно левого края панели. */
export function computeQuickAddMenuCaretLeft(
  anchorRect: DOMRect,
  panelLeft: number,
  panelWidth: number
): number {
  const anchorCenter = anchorRect.left + anchorRect.width / 2;
  const caretHalf = 6;
  return Math.min(
    panelWidth - caretHalf * 2 - 12,
    Math.max(12, anchorCenter - panelLeft - caretHalf)
  );
}
