import { describe, expect, it } from 'vitest';

import { SWIMLANE_PLACEMENT_TOOLS } from '../utils/swimlanePlacementToolbar';

import {
  formatPlacementToolShortcutHint,
  placementToolShortcutDigit,
  resolvePlacementToolShortcut,
  resolvePlacementToolbarKeyboardAction,
} from './swimlanePlacementToolbarKeyboard';

function keyEvent(
  code: string,
  mods: { altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {}
): Pick<KeyboardEvent, 'altKey' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey'> {
  return {
    altKey: Boolean(mods.altKey),
    code,
    ctrlKey: Boolean(mods.ctrlKey),
    metaKey: Boolean(mods.metaKey),
    shiftKey: Boolean(mods.shiftKey),
  };
}

describe('placementToolShortcutDigit', () => {
  it('numbers tools in toolbar order', () => {
    expect(SWIMLANE_PLACEMENT_TOOLS.map(placementToolShortcutDigit)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
    ]);
  });
});

describe('formatPlacementToolShortcutHint', () => {
  it('formats Cmd/Ctrl plus the tool digit', () => {
    expect(formatPlacementToolShortcutHint('cursor', 'Macintosh')).toBe('⌘+1');
    expect(formatPlacementToolShortcutHint('task', 'Windows')).toBe('Ctrl+3');
    expect(formatPlacementToolShortcutHint('availability', 'Macintosh')).toBe('⌘+7');
  });
});

describe('resolvePlacementToolShortcut', () => {
  it('maps Cmd/Ctrl+digit to the visible tool', () => {
    expect(
      resolvePlacementToolShortcut(keyEvent('Digit1', { metaKey: true }), SWIMLANE_PLACEMENT_TOOLS)
    ).toBe('cursor');
    expect(
      resolvePlacementToolShortcut(keyEvent('Digit3', { ctrlKey: true }), SWIMLANE_PLACEMENT_TOOLS)
    ).toBe('task');
    expect(
      resolvePlacementToolShortcut(keyEvent('Numpad4', { metaKey: true }), SWIMLANE_PLACEMENT_TOOLS)
    ).toBe('comment');
  });

  it('ignores hidden tools, modifiers without Ctrl/Cmd, and Shift/Alt', () => {
    const withoutAvailability = SWIMLANE_PLACEMENT_TOOLS.filter((tool) => tool !== 'availability');
    expect(
      resolvePlacementToolShortcut(keyEvent('Digit7', { metaKey: true }), withoutAvailability)
    ).toBeNull();
    expect(resolvePlacementToolShortcut(keyEvent('Digit2'), SWIMLANE_PLACEMENT_TOOLS)).toBeNull();
    expect(
      resolvePlacementToolShortcut(
        keyEvent('Digit2', { metaKey: true, shiftKey: true }),
        SWIMLANE_PLACEMENT_TOOLS
      )
    ).toBeNull();
    expect(
      resolvePlacementToolShortcut(
        keyEvent('Digit2', { metaKey: true, altKey: true }),
        SWIMLANE_PLACEMENT_TOOLS
      )
    ).toBeNull();
    expect(
      resolvePlacementToolShortcut(keyEvent('KeyL', { metaKey: true }), SWIMLANE_PLACEMENT_TOOLS)
    ).toBeNull();
  });
});

describe('resolvePlacementToolbarKeyboardAction', () => {
  it('returns cursor on Escape from a stamp tool', () => {
    expect(
      resolvePlacementToolbarKeyboardAction({
        availableTools: SWIMLANE_PLACEMENT_TOOLS,
        defaultPrevented: false,
        event: { ...keyEvent('Escape'), key: 'Escape' },
        fromEditableTarget: false,
        hasBlockingOverlay: false,
        placementTool: 'task',
      })
    ).toBe('cursor');
  });

  it('selects the tool for Cmd/Ctrl+digit when the canvas is free', () => {
    expect(
      resolvePlacementToolbarKeyboardAction({
        availableTools: SWIMLANE_PLACEMENT_TOOLS,
        defaultPrevented: false,
        event: { ...keyEvent('Digit5', { metaKey: true }), key: '5' },
        fromEditableTarget: false,
        hasBlockingOverlay: false,
        placementTool: 'cursor',
      })
    ).toBe('image');
  });

  it('does not steal digits while typing or over a blocking overlay', () => {
    expect(
      resolvePlacementToolbarKeyboardAction({
        availableTools: SWIMLANE_PLACEMENT_TOOLS,
        defaultPrevented: false,
        event: { ...keyEvent('Digit2', { metaKey: true }), key: '2' },
        fromEditableTarget: true,
        hasBlockingOverlay: false,
        placementTool: 'cursor',
      })
    ).toBeNull();
    expect(
      resolvePlacementToolbarKeyboardAction({
        availableTools: SWIMLANE_PLACEMENT_TOOLS,
        defaultPrevented: false,
        event: { ...keyEvent('Digit2', { metaKey: true }), key: '2' },
        fromEditableTarget: false,
        hasBlockingOverlay: true,
        placementTool: 'cursor',
      })
    ).toBeNull();
  });
});
