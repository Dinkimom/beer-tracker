/** @vitest-environment jsdom */

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SwimlaneDragHoverStore } from '@/lib/layers/application/swimlaneDrag';

import { SwimlaneDragHoverContext, useSwimlaneLaneHoveredCell } from './useSwimlaneDragHover';

afterEach(cleanup);

function createSyncFrames() {
  const pending: Array<() => void> = [];
  return {
    flush() {
      while (pending.length > 0) pending.shift()!();
    },
    scheduler: {
      cancel: () => {
        pending.length = 0;
      },
      request: (callback: () => void) => {
        pending.push(callback);
        return pending.length;
      },
    },
  };
}

function LaneProbe(props: { assigneeId: string; enabled?: boolean; renders: Map<string, number> }) {
  useSwimlaneLaneHoveredCell(props.assigneeId, props.enabled ?? true);
  props.renders.set(props.assigneeId, (props.renders.get(props.assigneeId) ?? 0) + 1);
  return null;
}

function renderLanes(laneCount: number, enabled = true) {
  const frames = createSyncFrames();
  const store = new SwimlaneDragHoverStore(frames.scheduler);
  const renders = new Map<string, number>();
  const lanes = Array.from({ length: laneCount }, (_, i) => `lane-${i}`);
  render(
    <SwimlaneDragHoverContext.Provider value={store}>
      {lanes.map((id) => (
        <LaneProbe key={id} assigneeId={id} enabled={enabled} renders={renders} />
      ))}
    </SwimlaneDragHoverContext.Provider>
  );
  const hover = (assigneeId: string | null, index = 0) => {
    act(() => {
      store.set(
        assigneeId == null ? null : { assigneeId, day: Math.floor(index / 3), part: index % 3 }
      );
      frames.flush();
    });
  };
  return { hover, lanes, renders };
}

describe('useSwimlaneLaneHoveredCell', () => {
  it('re-renders only the lanes the pointer enters or leaves (40 lanes × 30 cells)', () => {
    const { hover, lanes, renders } = renderLanes(40);
    const CELLS = 30;

    for (let i = 0; i < CELLS; i++) hover('lane-5', i);
    for (let i = 0; i < CELLS; i++) hover('lane-6', i);
    hover(null);

    expect(renders.get('lane-5')).toBe(1 + CELLS + 1);
    expect(renders.get('lane-6')).toBe(1 + CELLS + 1);
    for (const id of lanes) {
      if (id !== 'lane-5' && id !== 'lane-6') {
        expect(renders.get(id)).toBe(1);
      }
    }
  });

  it('stays idle while the subscription is disabled', () => {
    const { hover, lanes, renders } = renderLanes(10, false);
    for (let i = 0; i < 30; i++) hover('lane-1', i);
    for (const id of lanes) {
      expect(renders.get(id)).toBe(1);
    }
  });

  it('sweeping every cell of 40 lanes stays within budget', () => {
    const { hover, renders } = renderLanes(40);
    const started = performance.now();
    for (let lane = 0; lane < 40; lane++) {
      for (let i = 0; i < 30; i++) hover(`lane-${lane}`, i);
    }
    const elapsed = performance.now() - started;
    const total = [...renders.values()].reduce((sum, count) => sum + count, 0);

    expect(total).toBe(40 + 40 * 30 + 39);
    expect(elapsed).toBeLessThan(3000);
  });
});
