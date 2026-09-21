import type { QuickAddIssueSearchResult } from './types';
import type { Task } from '@/types';

import { STICKY_NOTE_COLORS, type StickyNoteColor } from '@/lib/comments/stickyNoteColor';

export function isQuickAddSubmitKey(
  event: Pick<KeyboardEvent, 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'>,
  allowPlainEnter: boolean
): boolean {
  if (event.key !== 'Enter' || event.shiftKey) {
    return false;
  }
  if (event.metaKey || event.ctrlKey) {
    return true;
  }
  return allowPlainEnter;
}

function resolveListItemFromArrowKey<T>(
  key: string,
  items: readonly T[],
  current: T
): T | null {
  if (items.length === 0) {
    return null;
  }
  const index = items.indexOf(current);
  const currentIndex = index < 0 ? 0 : index;
  if (key === 'Home') {
    return items[0] ?? null;
  }
  if (key === 'End') {
    return items[items.length - 1] ?? null;
  }
  if (key === 'ArrowRight' || key === 'ArrowDown') {
    return items[(currentIndex + 1) % items.length] ?? null;
  }
  if (key === 'ArrowLeft' || key === 'ArrowUp') {
    return items[(currentIndex - 1 + items.length) % items.length] ?? null;
  }
  return null;
}

export function resolveQuickAddModeFromTabKey<T extends string>(
  key: string,
  modes: readonly T[],
  current: T
): T | null {
  return resolveListItemFromArrowKey(key, modes, current);
}

export function resolveFocusedQuickAddMode<T extends string>(
  active: Element | null,
  modes: readonly T[]
): T | null {
  if (active instanceof HTMLElement) {
    const focused = modes.find((mode) => mode === active.dataset.quickAddMode);
    if (focused) {
      return focused;
    }
  }
  return modes[0] ?? null;
}

export function resolveQuickAddNoteColorFromKey(
  key: string,
  current: StickyNoteColor
): StickyNoteColor | null {
  return resolveListItemFromArrowKey(key, STICKY_NOTE_COLORS, current);
}

type QuickAddSearchInputAction = 'next' | 'prev' | 'submit';

export function resolveQuickAddSearchInputAction(key: string): QuickAddSearchInputAction | null {
  if (key === 'Enter') {
    return 'submit';
  }
  if (key === 'ArrowDown') {
    return 'next';
  }
  if (key === 'ArrowUp') {
    return 'prev';
  }
  return null;
}

export function moveQuickAddSearchActiveIndex(
  current: number,
  delta: number,
  count: number
): number {
  if (count <= 0) {
    return 0;
  }
  return Math.min(Math.max(current + delta, 0), count - 1);
}

export function applyQuickAddSearchInputKey(input: {
  activeIndex: number;
  isSearching: boolean;
  isSubmitting: boolean;
  key: string;
  resultCount: number;
}): { index: number; type: 'move' } | { type: 'submit' } | null {
  if (input.isSubmitting) {
    return null;
  }
  const action = resolveQuickAddSearchInputAction(input.key);
  if (!action) {
    return null;
  }
  if (action === 'submit') {
    return { type: 'submit' };
  }
  if (input.isSearching || input.resultCount === 0) {
    return null;
  }
  const delta = action === 'next' ? 1 : -1;
  return {
    index: moveQuickAddSearchActiveIndex(input.activeIndex, delta, input.resultCount),
    type: 'move',
  };
}

export function resolveExistingIssueToSubmit(
  results: readonly QuickAddIssueSearchResult[],
  isSearching: boolean,
  activeIndex = 0
): Task | null {
  if (isSearching || results.length === 0) {
    return null;
  }
  const index = Math.min(Math.max(activeIndex, 0), results.length - 1);
  return results[index]?.task ?? null;
}
