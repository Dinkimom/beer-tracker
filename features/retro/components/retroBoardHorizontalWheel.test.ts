/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { applyRetroBoardHorizontalWheel } from './retroBoardHorizontalWheel';

function boardStub(scrollWidth: number, clientWidth: number) {
  return {
    clientWidth,
    scrollLeft: 0,
    scrollWidth,
  } as HTMLElement;
}

describe('applyRetroBoardHorizontalWheel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ignores vertical-only wheel', () => {
    const board = boardStub(800, 400);
    const preventDefault = vi.fn();
    applyRetroBoardHorizontalWheel(board, {
      composedPath: () => [board],
      deltaX: 0,
      deltaY: 40,
      preventDefault,
    });
    expect(board.scrollLeft).toBe(0);
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('forwards horizontal wheel from nested overflow-y scroller', () => {
    const board = boardStub(800, 400);
    const nested = document.createElement('div');
    nested.style.overflowY = 'auto';
    document.body.appendChild(nested);
    const preventDefault = vi.fn();

    applyRetroBoardHorizontalWheel(board, {
      composedPath: () => [nested, board],
      deltaX: 30,
      deltaY: 0,
      preventDefault,
    });

    expect(board.scrollLeft).toBe(30);
    expect(preventDefault).toHaveBeenCalledOnce();
    nested.remove();
  });

  it('does not steal vertical-dominant gestures from the column', () => {
    const board = boardStub(800, 400);
    const nested = document.createElement('div');
    nested.style.overflowY = 'auto';
    document.body.appendChild(nested);
    const preventDefault = vi.fn();

    applyRetroBoardHorizontalWheel(board, {
      composedPath: () => [nested, board],
      deltaX: 5,
      deltaY: 40,
      preventDefault,
    });

    expect(board.scrollLeft).toBe(5);
    expect(preventDefault).not.toHaveBeenCalled();
    nested.remove();
  });
});
