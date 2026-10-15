/** @vitest-environment jsdom */

import { act, cleanup, render } from '@testing-library/react';
import { Profiler } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { SwimlaneSidebarDropPointerStore } from '@/lib/layers/application/swimlaneDrag';

import {
  SwimlaneSidebarDropPointerContext,
  useSidebarDropPointerY,
} from './useSidebarDropPointer';

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

function PointerProbe(props: { enabled?: boolean; id: string; renders: Map<string, number> }) {
  const y = useSidebarDropPointerY(props.enabled ?? true);
  props.renders.set(props.id, (props.renders.get(props.id) ?? 0) + 1);
  const slot = y == null ? '' : String(Math.floor(y / 50));
  return <div data-insert-slot={slot} data-pointer-y={y ?? ''} data-probe={props.id} />;
}

function createPointerStore() {
  const frames = createSyncFrames();
  const store = new SwimlaneSidebarDropPointerStore(frames.scheduler);
  const move = (y: number | null) => {
    act(() => {
      store.set(y);
      frames.flush();
    });
  };
  return { frames, move, store };
}

describe('useSidebarDropPointerY', () => {
  it('re-renders only the sidebar subscriber; planner owner stays at 1 mount', () => {
    const { move, store } = createPointerStore();
    const renders = new Map<string, number>();
    const commits = new Map<string, number>();
    const onRender = (id: string) => {
      commits.set(id, (commits.get(id) ?? 0) + 1);
    };

    const view = render(
      <SwimlaneSidebarDropPointerContext.Provider value={store}>
        <Profiler id="planner" onRender={onRender}>
          <div data-planner />
        </Profiler>
        <Profiler id="sidebar-slot" onRender={onRender}>
          <PointerProbe id="sidebar-slot" renders={renders} />
        </Profiler>
      </SwimlaneSidebarDropPointerContext.Provider>
    );

    for (let y = 100; y < 600; y += 10) {
      move(y);
    }
    move(null);

    expect(commits.get('planner')).toBe(1);
    expect(renders.get('sidebar-slot')).toBe(1 + 50 + 1);
    expect(view.container.querySelector('[data-pointer-y]')?.getAttribute('data-pointer-y')).toBe(
      ''
    );
  });

  it('stays idle while the subscription is disabled', () => {
    const { move, store } = createPointerStore();
    const renders = new Map<string, number>();
    render(
      <SwimlaneSidebarDropPointerContext.Provider value={store}>
        <PointerProbe enabled={false} id="idle" renders={renders} />
      </SwimlaneSidebarDropPointerContext.Provider>
    );

    for (let y = 0; y < 200; y++) {
      move(y);
    }

    expect(renders.get('idle')).toBe(1);
  });

  it('updates insert-slot marker from pointer Y without waking inert siblings', () => {
    const { move, store } = createPointerStore();
    const renders = new Map<string, number>();
    const commits = new Map<string, number>();
    const onRender = (id: string) => {
      commits.set(id, (commits.get(id) ?? 0) + 1);
    };

    const view = render(
      <SwimlaneSidebarDropPointerContext.Provider value={store}>
        <Profiler id="inert" onRender={onRender}>
          <div data-inert />
        </Profiler>
        <Profiler id="insert-slot" onRender={onRender}>
          <PointerProbe id="insert-slot" renders={renders} />
        </Profiler>
      </SwimlaneSidebarDropPointerContext.Provider>
    );

    const started = performance.now();
    for (let y = 0; y < 500; y += 5) {
      move(y);
    }
    const elapsed = performance.now() - started;

    expect(view.container.querySelector('[data-insert-slot]')?.getAttribute('data-insert-slot')).toBe(
      '9'
    );
    expect(commits.get('inert')).toBe(1);
    expect(commits.get('insert-slot')).toBe(1 + 100);
    expect(elapsed).toBeLessThan(3000);
  });

  it('sweeping 10k pointer Y updates stays within budget for a single subscriber', () => {
    const { move, store } = createPointerStore();
    const renders = new Map<string, number>();
    render(
      <SwimlaneSidebarDropPointerContext.Provider value={store}>
        <PointerProbe id="slot" renders={renders} />
      </SwimlaneSidebarDropPointerContext.Provider>
    );

    const started = performance.now();
    for (let y = 1; y <= 10_000; y++) {
      move(y);
    }
    const elapsed = performance.now() - started;

    expect(renders.get('slot')).toBe(1 + 10_000);
    expect(elapsed).toBeLessThan(3000);
  });
});
