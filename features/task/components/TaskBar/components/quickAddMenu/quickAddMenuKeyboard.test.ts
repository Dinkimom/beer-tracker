/** @vitest-environment jsdom */

import type { QuickAddIssueSearchResult } from './types';
import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  isQuickAddSubmitKey,
  applyQuickAddSearchInputKey,
  moveQuickAddSearchActiveIndex,
  resolveExistingIssueToSubmit,
  resolveFocusedQuickAddMode,
  resolveQuickAddModeFromTabKey,
  resolveQuickAddNoteColorFromKey,
  resolveQuickAddSearchInputAction,
} from './quickAddMenuKeyboard';

function keyEvent(
  key: string,
  mods: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {}
): Pick<KeyboardEvent, 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'> {
  return {
    ctrlKey: Boolean(mods.ctrlKey),
    key,
    metaKey: Boolean(mods.metaKey),
    shiftKey: Boolean(mods.shiftKey),
  };
}

describe('isQuickAddSubmitKey', () => {
  it('submits a task title on Enter or ⌘Enter, not Shift+Enter', () => {
    expect(isQuickAddSubmitKey(keyEvent('Enter'), true)).toBe(true);
    expect(isQuickAddSubmitKey(keyEvent('Enter', { metaKey: true }), true)).toBe(true);
    expect(isQuickAddSubmitKey(keyEvent('Enter', { shiftKey: true }), true)).toBe(false);
  });

  it('submits a note only with the modifier+Enter shortcut', () => {
    expect(isQuickAddSubmitKey(keyEvent('Enter'), false)).toBe(false);
    expect(isQuickAddSubmitKey(keyEvent('Enter', { metaKey: true }), false)).toBe(true);
    expect(isQuickAddSubmitKey(keyEvent('Enter', { ctrlKey: true }), false)).toBe(true);
  });
});

describe('resolveQuickAddModeFromTabKey', () => {
  const modes = ['new', 'existing', 'comment', 'image'] as const;

  it('wraps with arrows and jumps with Home/End', () => {
    expect(resolveQuickAddModeFromTabKey('ArrowRight', modes, 'new')).toBe('existing');
    expect(resolveQuickAddModeFromTabKey('ArrowLeft', modes, 'new')).toBe('image');
    expect(resolveQuickAddModeFromTabKey('Home', modes, 'comment')).toBe('new');
    expect(resolveQuickAddModeFromTabKey('End', modes, 'new')).toBe('image');
  });

  it('ignores unrelated keys', () => {
    expect(resolveQuickAddModeFromTabKey('Enter', modes, 'new')).toBeNull();
  });
});

describe('resolveFocusedQuickAddMode', () => {
  const modes = ['new', 'existing', 'comment'] as const;

  it('reads the focused menuitem, then falls back to the first mode', () => {
    const button = document.createElement('button');
    button.dataset.quickAddMode = 'comment';
    expect(resolveFocusedQuickAddMode(button, modes)).toBe('comment');
    expect(resolveFocusedQuickAddMode(document.createElement('button'), modes)).toBe('new');
    expect(resolveFocusedQuickAddMode(null, modes)).toBe('new');
    expect(resolveFocusedQuickAddMode(null, [])).toBeNull();
  });
});

describe('resolveQuickAddNoteColorFromKey', () => {
  it('walks the sticky-note palette with arrows and Home/End', () => {
    expect(resolveQuickAddNoteColorFromKey('ArrowRight', 'yellow')).toBe('pink');
    expect(resolveQuickAddNoteColorFromKey('ArrowLeft', 'yellow')).toBe('gray');
    expect(resolveQuickAddNoteColorFromKey('Home', 'blue')).toBe('yellow');
    expect(resolveQuickAddNoteColorFromKey('End', 'yellow')).toBe('gray');
    expect(resolveQuickAddNoteColorFromKey('Enter', 'pink')).toBeNull();
  });
});

describe('resolveExistingIssueToSubmit', () => {
  const first = { key: 'A-1', summary: 'One', task: { id: '1', name: 'One' } as Task };
  const second = { key: 'A-2', summary: 'Two', task: { id: '2', name: 'Two' } as Task };
  const results = [first, second] as QuickAddIssueSearchResult[];

  it('picks the first finished result by default', () => {
    expect(resolveExistingIssueToSubmit(results, false)).toBe(first.task);
  });

  it('picks the active result when an index is provided', () => {
    expect(resolveExistingIssueToSubmit(results, false, 1)).toBe(second.task);
    expect(resolveExistingIssueToSubmit(results, false, 9)).toBe(second.task);
  });

  it('waits while search is in flight', () => {
    expect(resolveExistingIssueToSubmit(results, true)).toBeNull();
    expect(resolveExistingIssueToSubmit([], false)).toBeNull();
  });
});

describe('applyQuickAddSearchInputKey', () => {
  it('moves or submits from the search field', () => {
    expect(
      applyQuickAddSearchInputKey({
        activeIndex: 0,
        isSearching: false,
        isSubmitting: false,
        key: 'ArrowDown',
        resultCount: 3,
      })
    ).toEqual({ index: 1, type: 'move' });
    expect(
      applyQuickAddSearchInputKey({
        activeIndex: 1,
        isSearching: false,
        isSubmitting: false,
        key: 'Enter',
        resultCount: 3,
      })
    ).toEqual({ type: 'submit' });
  });

  it('ignores list keys while submitting or while results are not ready', () => {
    expect(
      applyQuickAddSearchInputKey({
        activeIndex: 0,
        isSearching: false,
        isSubmitting: true,
        key: 'Enter',
        resultCount: 2,
      })
    ).toBeNull();
    expect(
      applyQuickAddSearchInputKey({
        activeIndex: 0,
        isSearching: true,
        isSubmitting: false,
        key: 'ArrowDown',
        resultCount: 2,
      })
    ).toBeNull();
  });
});

describe('resolveQuickAddSearchInputAction', () => {
  it('maps list navigation and submit keys', () => {
    expect(resolveQuickAddSearchInputAction('Enter')).toBe('submit');
    expect(resolveQuickAddSearchInputAction('ArrowDown')).toBe('next');
    expect(resolveQuickAddSearchInputAction('ArrowUp')).toBe('prev');
    expect(resolveQuickAddSearchInputAction('Tab')).toBeNull();
  });
});

describe('moveQuickAddSearchActiveIndex', () => {
  it('clamps within the list and stays at zero when empty', () => {
    expect(moveQuickAddSearchActiveIndex(0, 1, 3)).toBe(1);
    expect(moveQuickAddSearchActiveIndex(2, 1, 3)).toBe(2);
    expect(moveQuickAddSearchActiveIndex(0, -1, 3)).toBe(0);
    expect(moveQuickAddSearchActiveIndex(4, 1, 0)).toBe(0);
  });
});
