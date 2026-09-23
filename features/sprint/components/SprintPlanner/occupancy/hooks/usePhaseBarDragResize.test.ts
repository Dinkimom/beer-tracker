/** @vitest-environment jsdom */

import type { Task, TaskPosition } from '@/types';
import type { MouseEvent as ReactMouseEvent } from 'react';

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePhaseBarDragResize } from './usePhaseBarDragResize';

function position(): TaskPosition {
  return {
    assignee: 'dev-1',
    duration: 3,
    startDay: 1,
    startPart: 0,
    taskId: 'TASK-1',
  };
}

function mountRow() {
  const row = document.createElement('tr');
  const handle = document.createElement('div');
  row.append(handle);
  document.body.append(row);
  row.getBoundingClientRect = () =>
    ({
      bottom: 20,
      height: 20,
      left: 0,
      right: 1000,
      top: 0,
      width: 1000,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      },
    }) as DOMRect;
  return {
    handle,
    remove: () => {
      row.remove();
    },
  };
}

describe('usePhaseBarDragResize', () => {
  afterEach(() => {
    document.body.replaceChildren();
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  it('restores the phase bar when Escape cancels a resize', () => {
    const { handle, remove } = mountRow();
    const onSave = vi.fn();
    const onPreviewChange = vi.fn();
    const { result } = renderHook(() =>
      usePhaseBarDragResize({
        durationCells: 3,
        endCell: 5,
        isDayMode: false,
        onPreviewChange,
        onSave,
        position: position(),
        resolvedTotalParts: 10,
        startCell: 2,
        task: { id: 'TASK-1' } as Task,
      })
    );

    act(() => {
      result.current.handleResizeStart(
        {
          clientX: 500,
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          target: handle,
        } as unknown as ReactMouseEvent,
        'right'
      );
    });
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 900 }));
    });

    expect(result.current.isResizing).toBe(true);
    expect(result.current.displayDuration).not.toBe(3);

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      );
    });
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'));
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(onPreviewChange).toHaveBeenLastCalledWith(null, { discard: true });
    expect(result.current.isResizing).toBe(false);
    expect(result.current.displayDuration).toBe(3);
    expect(result.current.displayStartCell).toBe(2);
    expect(document.body.style.cursor).toBe('');
    remove();
  });
});
