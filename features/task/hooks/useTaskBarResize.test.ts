/** @vitest-environment jsdom */

import type { MouseEvent as ReactMouseEvent } from 'react';

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useTaskBarResize } from './useTaskBarResize';

function rect(left: number, width: number): DOMRect {
  return {
    bottom: 20,
    height: 20,
    left,
    right: left + width,
    top: 0,
    width,
    x: left,
    y: 0,
    toJSON() {
      return {};
    },
  } as DOMRect;
}

function mountCard() {
  const swimlane = document.createElement('div');
  swimlane.dataset.swimlane = '';
  const card = document.createElement('div');
  card.dataset.taskId = 't1';
  const handle = document.createElement('button');
  card.append(handle);
  swimlane.append(card);
  document.body.append(swimlane);
  swimlane.getBoundingClientRect = () => rect(0, 1000);
  card.getBoundingClientRect = () => rect(0, 100);
  return {
    handle,
    remove: () => {
      swimlane.remove();
    },
  };
}

function startResize(handle: HTMLElement) {
  return {
    currentTarget: handle,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as ReactMouseEvent;
}

describe('useTaskBarResize', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('keeps the original duration when Escape cancels the gesture', () => {
    const { handle, remove } = mountCard();
    const onResize = vi.fn();
    const onResizePreview = vi.fn();
    const onResizeSessionChange = vi.fn();
    const { result } = renderHook(() =>
      useTaskBarResize({
        duration: 1,
        onResize,
        onResizePreview,
        onResizeSessionChange,
        timelineTotalCells: 10,
      })
    );

    act(() => {
      result.current.handleResizeStart(startResize(handle), 'right');
    });
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 450 }));
    });

    expect(result.current.isResizing).toBe(true);
    expect(result.current.resizePreviewDuration).toBe(5);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'));
    });

    expect(onResize).not.toHaveBeenCalled();
    expect(onResizePreview).toHaveBeenLastCalledWith(null, { discard: true });
    expect(onResizeSessionChange).toHaveBeenLastCalledWith(false);
    expect(result.current.isResizing).toBe(false);
    expect(result.current.resizePreviewDuration).toBeNull();
    expect(result.current.resizeSide).toBeNull();
    remove();
  });
});
