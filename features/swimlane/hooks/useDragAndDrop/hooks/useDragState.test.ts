/** @vitest-environment jsdom */

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useDragState } from './useDragState';

afterEach(cleanup);

function renderCountedDragState() {
  let renders = 0;
  const hook = renderHook(() => {
    renders++;
    return useDragState(5);
  });
  return { hook, renders: () => renders };
}

describe('useDragState', () => {
  it('pointer moves over 10k cells never re-render the planner owner', () => {
    const { hook, renders } = renderCountedDragState();
    act(() => {
      hook.result.current.dragStateApi.beginDragSession('TASK-1', 'TASK-1');
    });
    const afterBegin = renders();

    act(() => {
      for (let i = 0; i < 10_000; i++) {
        hook.result.current.dragStateApi.setHoveredCell({
          assigneeId: `lane-${i % 40}`,
          day: Math.floor(i / 3) % 10,
          part: i % 3,
        });
      }
    });

    expect(renders()).toBe(afterBegin);
  });

  it('drag-end reads the latest cell synchronously, before the frame commits', () => {
    const { hook } = renderCountedDragState();
    const api = hook.result.current.dragStateApi;
    act(() => {
      api.beginDragSession('TASK-1', 'TASK-1');
      api.setHoveredCell({ assigneeId: 'lane-1', day: 2, part: 1 });
    });
    expect(api.hoveredCell).toEqual({ assigneeId: 'lane-1', day: 2, part: 1 });
    expect(hook.result.current.hoverStore.getLatest()).toEqual(api.hoveredCell);
  });

  it('reset clears hover for subscribers immediately', () => {
    const { hook } = renderCountedDragState();
    const { dragStateApi, hoverStore } = hook.result.current;
    act(() => {
      dragStateApi.beginDragSession('TASK-1', 'TASK-1');
      dragStateApi.setHoveredCell({ assigneeId: 'lane-1', day: 0, part: 0 });
    });
    act(() => {
      dragStateApi.resetDragState();
    });
    expect(hoverStore.getSnapshot()).toBeNull();
    expect(dragStateApi.hoveredCell).toBeNull();
  });
});
