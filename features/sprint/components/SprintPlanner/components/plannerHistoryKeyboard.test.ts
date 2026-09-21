/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import {
  formatPlannerHistoryShortcutHint,
  isPlannerHistoryShortcutBlockedTarget,
  resolvePlannerHistoryShortcut,
} from './plannerHistoryKeyboard';

function keyEvent(
  key: string,
  mods: { altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {}
): Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'> {
  return {
    altKey: Boolean(mods.altKey),
    ctrlKey: Boolean(mods.ctrlKey),
    key,
    metaKey: Boolean(mods.metaKey),
    shiftKey: Boolean(mods.shiftKey),
  };
}

describe('resolvePlannerHistoryShortcut', () => {
  it('распознаёт Cmd/Ctrl+Z как undo и Shift+Z как redo', () => {
    expect(resolvePlannerHistoryShortcut(keyEvent('z', { metaKey: true }))).toBe('undo');
    expect(resolvePlannerHistoryShortcut(keyEvent('Z', { ctrlKey: true }))).toBe('undo');
    expect(resolvePlannerHistoryShortcut(keyEvent('z', { metaKey: true, shiftKey: true }))).toBe(
      'redo'
    );
    expect(resolvePlannerHistoryShortcut(keyEvent('z', { ctrlKey: true, shiftKey: true }))).toBe(
      'redo'
    );
  });

  it('игнорирует Alt и клавиши без модификатора', () => {
    expect(resolvePlannerHistoryShortcut(keyEvent('z'))).toBeNull();
    expect(resolvePlannerHistoryShortcut(keyEvent('z', { metaKey: true, altKey: true }))).toBeNull();
    expect(resolvePlannerHistoryShortcut(keyEvent('y', { metaKey: true }))).toBeNull();
  });
});

describe('isPlannerHistoryShortcutBlockedTarget', () => {
  it('блокирует input/textarea/select и contenteditable', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const select = document.createElement('select');
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    const plain = document.createElement('div');

    expect(isPlannerHistoryShortcutBlockedTarget(input)).toBe(true);
    expect(isPlannerHistoryShortcutBlockedTarget(textarea)).toBe(true);
    expect(isPlannerHistoryShortcutBlockedTarget(select)).toBe(true);
    expect(isPlannerHistoryShortcutBlockedTarget(editable)).toBe(true);
    expect(isPlannerHistoryShortcutBlockedTarget(plain)).toBe(false);
    expect(isPlannerHistoryShortcutBlockedTarget(null)).toBe(false);
  });
});

describe('formatPlannerHistoryShortcutHint', () => {
  it('форматирует подсказки под Mac и Windows', () => {
    expect(formatPlannerHistoryShortcutHint('undo', 'Macintosh')).toBe('⌘+Z');
    expect(formatPlannerHistoryShortcutHint('redo', 'Macintosh')).toBe('⇧⌘Z');
    expect(formatPlannerHistoryShortcutHint('undo', 'Windows')).toBe('Ctrl+Z');
    expect(formatPlannerHistoryShortcutHint('redo', 'Windows')).toBe('Ctrl+Shift+Z');
  });
});
