import type { Anchor } from '@/types';

import {
  anchorMidpoint,
  type RectLike,
  type XarrowAnchorSpec,
  xarrowAnchorOffset,
  xarrowAnchorPosition,
} from '@/utils/nearestSideAnchors';

export const LINK_ARROW_DELETE_BUTTON_SIZE_PX = 20;

export interface LinkArrowDeleteHandle {
  fromTaskId: string;
  id: string;
  startElementId: string;
  toElementId: string;
}

export const LINK_ARROW_DELETE_HANDLE_SELECTOR = '[data-link-delete-handle]';

export function isLinkDeleteHandleEventTarget(target: EventTarget | null): boolean {
  return (
    typeof Element !== 'undefined' &&
    target instanceof Element &&
    target.closest(LINK_ARROW_DELETE_HANDLE_SELECTOR) != null
  );
}

export function isEventTargetInsideTask(target: EventTarget | null, taskId: string): boolean {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return false;
  return target.closest('[data-task-id]')?.getAttribute('data-task-id') === taskId;
}

export function isLinkDeleteHandleVisible(input: {
  fromTaskId: string;
  handleId: string;
  hoveredLinkId: string | null;
  hoveredSourceId: string | null;
  /** Режим «Связь»: все крестики видимы сразу. */
  showAll?: boolean;
}): boolean {
  if (input.showAll) {
    return true;
  }
  return input.hoveredSourceId === input.fromTaskId || input.hoveredLinkId === input.handleId;
}

export function bindLinkDeleteHandler(
  onDeleteLink: ((linkId: string) => void) | undefined,
  clearHover: () => void
): ((linkId: string) => void) | undefined {
  if (onDeleteLink == null) return undefined;
  return (linkId) => {
    clearHover();
    onDeleteLink(linkId);
  };
}

export function resolveLinkDeleteHandleOffset(
  fromRect: RectLike,
  overlayRect: RectLike,
  startAnchor: Anchor | XarrowAnchorSpec,
  buttonSize: number = LINK_ARROW_DELETE_BUTTON_SIZE_PX
): { left: number; top: number } {
  const mid = anchorMidpoint(fromRect, xarrowAnchorPosition(startAnchor));
  const offset = xarrowAnchorOffset(startAnchor);
  const half = buttonSize / 2;
  return {
    left: mid.x + offset.x - overlayRect.left - half,
    top: mid.y + offset.y - overlayRect.top - half,
  };
}

export function resolveLinkDeleteHandleStyle(
  startElementId: string,
  startAnchor: Anchor | XarrowAnchorSpec,
  overlayRect: DOMRect | undefined,
  buttonSize: number = LINK_ARROW_DELETE_BUTTON_SIZE_PX
): { left: number; top: number } | null {
  if (typeof document === 'undefined' || overlayRect == null) return null;
  const fromEl = document.getElementById(startElementId);
  if (!fromEl) return null;
  return resolveLinkDeleteHandleOffset(
    fromEl.getBoundingClientRect(),
    overlayRect,
    startAnchor,
    buttonSize
  );
}
