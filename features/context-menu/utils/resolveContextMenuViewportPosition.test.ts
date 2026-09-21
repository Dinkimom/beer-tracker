/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import {
  measureContextMenuLayoutSize,
  resolveContextMenuFollowAnchorId,
  resolveContextMenuQuickActionsAlignClass,
  resolveContextMenuViewportPosition,
} from './resolveContextMenuViewportPosition';

describe('resolveContextMenuViewportPosition', () => {
  it('places the menu to the right of an anchored card', () => {
    expect(
      resolveContextMenuViewportPosition({
        anchorRect: { left: 40, right: 120, top: 30 },
        menuHeight: 120,
        menuWidth: 220,
        position: { x: 0, y: 0 },
        viewportHeight: 800,
        viewportWidth: 1200,
      })
    ).toEqual({ anchorSide: 'right', left: 128, top: 30 });
  });

  it('flips to the left when the menu would overflow the viewport', () => {
    expect(
      resolveContextMenuViewportPosition({
        anchorRect: { left: 900, right: 1180, top: 40 },
        menuHeight: 120,
        menuWidth: 220,
        position: { x: 0, y: 0 },
        viewportHeight: 800,
        viewportWidth: 1200,
      })
    ).toEqual({ anchorSide: 'left', left: 672, top: 40 });
  });

  it('keeps an 8px gap when flipped left (not flush against the card)', () => {
    const anchorLeft = 900;
    const menuWidth = 280;
    const positioned = resolveContextMenuViewportPosition({
      anchorRect: { left: anchorLeft, right: 1180, top: 40 },
      menuHeight: 200,
      menuWidth,
      position: { x: 0, y: 0 },
      viewportHeight: 800,
      viewportWidth: 1200,
    });
    expect(positioned.anchorSide).toBe('left');
    expect(anchorLeft - (positioned.left + menuWidth)).toBe(8);
  });

  it('uses the cursor position when there is no card anchor', () => {
    expect(
      resolveContextMenuViewportPosition({
        menuHeight: 120,
        menuWidth: 220,
        position: { x: 80, y: 60 },
        viewportHeight: 800,
        viewportWidth: 1200,
      })
    ).toEqual({ anchorSide: 'right', left: 80, top: 60 });
  });

  it('packs quick-action buttons toward the card', () => {
    expect(resolveContextMenuQuickActionsAlignClass('right')).toBe('justify-start');
    expect(resolveContextMenuQuickActionsAlignClass('left')).toBe('justify-end');
  });
});

describe('measureContextMenuLayoutSize', () => {
  it('reads offset size so enter scale does not shrink the measured menu', () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'offsetWidth', { configurable: true, value: 280 });
    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 200 });
    el.getBoundingClientRect = () =>
      ({
        width: 268.8,
        height: 192,
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    expect(measureContextMenuLayoutSize(el)).toEqual({ height: 200, width: 280 });
  });
});

describe('resolveContextMenuFollowAnchorId', () => {
  it('returns the swimlane task bar id wrapping the card', () => {
    const bar = document.createElement('div');
    bar.id = 'task-ABC-1-seg-1';
    bar.setAttribute('data-draggable-id', 'ABC-1');
    bar.setAttribute('data-task-id', 'ABC-1');
    const card = document.createElement('div');
    card.setAttribute('data-context-menu-source', 'task-card');
    bar.appendChild(card);
    document.body.appendChild(bar);

    expect(resolveContextMenuFollowAnchorId(card)).toBe('task-ABC-1-seg-1');

    bar.remove();
  });

  it('returns undefined for occupancy rows without a swimlane bar wrapper', () => {
    const row = document.createElement('div');
    row.setAttribute('data-context-menu-source', 'occupancy-task-row');
    document.body.appendChild(row);

    expect(resolveContextMenuFollowAnchorId(row)).toBeUndefined();

    row.remove();
  });

  it('returns undefined when the wrapper has no id', () => {
    const bar = document.createElement('div');
    bar.setAttribute('data-draggable-id', 'ABC-1');
    bar.setAttribute('data-task-id', 'ABC-1');
    const card = document.createElement('div');
    bar.appendChild(card);
    document.body.appendChild(bar);

    expect(resolveContextMenuFollowAnchorId(card)).toBeUndefined();

    bar.remove();
  });
});
