import { describe, expect, it } from 'vitest';

import {
  SWIMLANE_ROW_RESIZE_HIGHLIGHT_STRIP_CLASS,
  resolveSwimlaneRowResizeHandleGripLineClass,
  resolveSwimlaneRowResizeHandleShellClass,
  resolveSwimlaneRowResizeHandleStripClass,
  resolveSwimlaneRowResizeHighlightStripClass,
} from './SwimlaneRowBorderResizeHandle';

describe('resolveSwimlaneRowResizeHandleShellClass', () => {
  it('keeps the handle visible while the border is active', () => {
    expect(resolveSwimlaneRowResizeHandleShellClass(true)).toContain('opacity-100');
  });

  it('reveals the handle when the assignee cell is hovered', () => {
    const className = resolveSwimlaneRowResizeHandleShellClass(false);
    expect(className).toContain('opacity-0');
    expect(className).toContain('pointer-events-auto');
    expect(className).toContain('group-hover:opacity-100');
  });
});

describe('SWIMLANE_ROW_RESIZE_HIGHLIGHT_STRIP_CLASS', () => {
  it('keeps a single highlight height for assignee and days strips', () => {
    expect(SWIMLANE_ROW_RESIZE_HIGHLIGHT_STRIP_CLASS).toContain('h-1.5');
  });
});

describe('resolveSwimlaneRowResizeHighlightStripClass', () => {
  it('uses the pressed stack while resizing (days strip mirrors assignee)', () => {
    const className = resolveSwimlaneRowResizeHighlightStripClass(true, false);
    expect(className).toContain('h-1.5');
    expect(className).toContain('bg-blue-500');
    expect(className).toContain('after:bg-blue-100/60');
  });

  it('keeps the wash for border hover only on the assignee handle path', () => {
    expect(resolveSwimlaneRowResizeHighlightStripClass(false, true)).toContain(
      'bg-blue-100/60'
    );
    expect(resolveSwimlaneRowResizeHighlightStripClass(false, false)).toContain(
      'bg-transparent'
    );
  });
});

describe('resolveSwimlaneRowResizeHandleStripClass', () => {
  it('matches the column-handle press stack while resizing', () => {
    const className = resolveSwimlaneRowResizeHandleStripClass(true, false);
    expect(className).toContain('bg-blue-500');
    expect(className).toContain('after:bg-blue-100/60');
  });

  it('shows the wash only when the border is hovered', () => {
    expect(resolveSwimlaneRowResizeHandleStripClass(false, true)).toBe(
      'bg-blue-100/60 dark:bg-blue-900/40'
    );
    expect(resolveSwimlaneRowResizeHandleStripClass(false, false)).toBe('bg-transparent');
  });
});

describe('resolveSwimlaneRowResizeHandleGripLineClass', () => {
  it('uses the active grip color on border hover or resize', () => {
    expect(resolveSwimlaneRowResizeHandleGripLineClass(true)).toBe('bg-blue-600');
  });
});
