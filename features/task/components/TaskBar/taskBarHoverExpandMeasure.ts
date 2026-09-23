import { CARD_MARGIN } from '@/constants';
import { STICKY_NOTE_CONTENT_DATA_ATTR } from '@/features/comments/utils/stickyNoteCommentContentOverflow';
import { TASK_CARD_TITLE_DATA_ATTR } from '@/features/task/components/TaskCard/components/taskCardContentHelpers';

import {
  resolveHoverExpandFitDurationParts,
  resolveHoverExpandTargetDurationParts,
} from './taskBarHoverExpandFit';

function clearTextClamp(element: HTMLElement): void {
  element.style.display = 'block';
  element.style.height = 'auto';
  element.style.maxHeight = 'none';
  element.style.minHeight = '0';
  element.style.overflow = 'visible';
  element.style.webkitLineClamp = 'unset';
  element.style.setProperty('-webkit-box-orient', 'unset');
}

function measureFullTextHeight(source: HTMLElement, widthPx: number): number {
  const probe = source.cloneNode(true);
  if (!(probe instanceof HTMLElement)) return 0;
  const computed = getComputedStyle(source);
  probe.style.position = 'fixed';
  probe.style.left = '0';
  probe.style.top = '0';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style.boxSizing = 'border-box';
  probe.style.font = computed.font;
  probe.style.letterSpacing = computed.letterSpacing;
  probe.style.lineHeight = computed.lineHeight;
  probe.style.overflowWrap = computed.overflowWrap;
  probe.style.padding = computed.padding;
  probe.style.whiteSpace = 'normal';
  probe.style.width = `${widthPx}px`;
  probe.style.maxWidth = `${widthPx}px`;
  probe.style.wordBreak = computed.wordBreak;
  clearTextClamp(probe);
  probe.querySelectorAll<HTMLElement>('[data-sticky-note-clamped-text]').forEach(clearTextClamp);
  document.body.appendChild(probe);
  const height = probe.scrollHeight;
  probe.remove();
  return height;
}

function resolveHoverExpandTextTarget(
  card: HTMLElement,
  isCommentCard: boolean
): { availableHeightPx: number; target: HTMLElement } | null {
  if (isCommentCard) {
    const root = card.querySelector<HTMLElement>(`[${STICKY_NOTE_CONTENT_DATA_ATTR}]`);
    if (!root) return null;
    const clamped = root.querySelector<HTMLElement>('[data-sticky-note-clamped-text]');
    return { availableHeightPx: root.clientHeight, target: clamped ?? root };
  }
  const title = card.querySelector<HTMLElement>(`[${TASK_CARD_TITLE_DATA_ATTR}]`);
  if (!title) return null;
  return {
    availableHeightPx: title.parentElement?.clientHeight ?? title.clientHeight,
    target: title,
  };
}

function timelineWidthPxFromBar(
  barWidthPx: number,
  durationParts: number,
  timelineTotalParts: number
): number {
  if (barWidthPx <= 0 || durationParts <= 0 || timelineTotalParts <= 0) return 0;
  return ((barWidthPx + CARD_MARGIN * 2) * timelineTotalParts) / durationParts;
}

export function measureTaskBarHoverExpandFitDurationParts(params: {
  cardElement: HTMLElement;
  currentDurationParts: number;
  isCommentCard?: boolean;
  timelineTotalParts: number;
}): number {
  const fallback = resolveHoverExpandTargetDurationParts({
    currentDurationParts: params.currentDurationParts,
    measuredFitDurationParts: null,
  });
  const bar = params.cardElement.closest('.task-bar-item');
  const text = resolveHoverExpandTextTarget(params.cardElement, params.isCommentCard === true);
  if (!(bar instanceof HTMLElement) || !text) return fallback;

  const currentCardWidthPx = bar.getBoundingClientRect().width;
  const timelineWidthPx = timelineWidthPxFromBar(
    currentCardWidthPx,
    params.currentDurationParts,
    params.timelineTotalParts
  );
  return resolveHoverExpandFitDurationParts({
    availableHeightPx: text.availableHeightPx,
    currentCardWidthPx,
    currentContentWidthPx: text.target.getBoundingClientRect().width,
    currentDurationParts: params.currentDurationParts,
    measureHeightAtContentWidth: (contentWidthPx) => measureFullTextHeight(text.target, contentWidthPx),
    timelineTotalParts: params.timelineTotalParts,
    timelineWidthPx,
  });
}
