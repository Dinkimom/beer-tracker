/** @vitest-environment jsdom */

import type { MouseEvent as ReactMouseEvent } from 'react';

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MobxRootProvider, useRootStore } from '@/lib/layers';

import { useStickyNoteVerticalResize } from './useStickyNoteVerticalResize';

function rect(top: number): DOMRect {
  return {
    bottom: top + 80,
    height: 80,
    left: 0,
    right: 200,
    top,
    width: 200,
    x: 0,
    y: top,
    toJSON() {
      return {};
    },
  } as DOMRect;
}

function mountNote() {
  const row = document.createElement('div');
  const card = document.createElement('div');
  card.dataset.taskId = 'note-1';
  const handle = document.createElement('button');
  card.append(handle);
  row.append(card);
  document.body.append(row);
  row.getBoundingClientRect = () => rect(0);
  return {
    handle,
    remove: () => {
      row.remove();
    },
  };
}

function useResizeProbe(onLayoutCommit: (layout: { layerShiftUp: number; span: number }) => void) {
  const { sprintPlannerUi } = useRootStore();
  const resize = useStickyNoteVerticalResize({
    assignedTaskLayer: 0,
    enabled: true,
    hasTaskOverlaps: true,
    layerHeight: 40,
    onLayoutCommit,
    onResizeSessionChange: vi.fn(),
    taskBandTotalHeight: 400,
    taskId: 'note-1',
  });
  return { resize, sprintPlannerUi };
}

describe('useStickyNoteVerticalResize', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('drops the height preview on Escape and does not commit the layout', () => {
    const { handle, remove } = mountNote();
    const onLayoutCommit = vi.fn();
    const { result } = renderHook(() => useResizeProbe(onLayoutCommit), {
      wrapper: MobxRootProvider,
    });

    act(() => {
      result.current.resize.handleResizeStart(
        {
          currentTarget: handle,
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        } as unknown as ReactMouseEvent,
        'bottom'
      );
    });
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientY: 200 }));
    });

    expect(result.current.sprintPlannerUi.stickyNoteCardRowPreview?.taskId).toBe('note-1');
    expect(result.current.resize.isResizing).toBe(true);

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      );
    });
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'));
    });

    expect(onLayoutCommit).not.toHaveBeenCalled();
    expect(result.current.sprintPlannerUi.stickyNoteCardRowPreview).toBeNull();
    expect(result.current.sprintPlannerUi.getStickyNoteCardRowOverride('note-1')).toBeUndefined();
    expect(result.current.resize.isResizing).toBe(false);
    expect(result.current.resize.resizeSide).toBeNull();
    remove();
  });
});
