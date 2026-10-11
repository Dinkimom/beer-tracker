import { describe, expect, it } from 'vitest';

import { SwimlaneDragHoverStore } from './swimlaneDragHoverStore';

function createManualFrames() {
  let nextId = 1;
  const pending = new Map<number, () => void>();
  return {
    flush() {
      const callbacks = [...pending.values()];
      pending.clear();
      for (const callback of callbacks) callback();
    },
    get pendingCount() {
      return pending.size;
    },
    scheduler: {
      cancel: (id: number) => {
        pending.delete(id);
      },
      request: (callback: () => void) => {
        const id = nextId++;
        pending.set(id, callback);
        return id;
      },
    },
  };
}

function cell(assigneeId: string, index: number) {
  return { assigneeId, day: Math.floor(index / 3), part: index % 3 };
}

describe('SwimlaneDragHoverStore', () => {
  it('exposes the latest cell synchronously and commits it once per frame', () => {
    const frames = createManualFrames();
    const store = new SwimlaneDragHoverStore(frames.scheduler);
    let notifications = 0;
    store.subscribe(() => {
      notifications++;
    });

    store.set(cell('a', 1));
    store.set(cell('a', 2));
    store.set(cell('a', 3));

    expect(store.getLatest()).toEqual(cell('a', 3));
    expect(store.getSnapshot()).toBeNull();
    expect(frames.pendingCount).toBe(1);

    frames.flush();
    expect(store.getSnapshot()).toEqual(cell('a', 3));
    expect(notifications).toBe(1);
  });

  it('ignores the same cell and does not schedule a frame', () => {
    const frames = createManualFrames();
    const store = new SwimlaneDragHoverStore(frames.scheduler);
    store.set(cell('a', 1));
    frames.flush();
    const committed = store.getSnapshot();

    store.set(cell('a', 1));
    expect(frames.pendingCount).toBe(0);
    expect(store.getSnapshot()).toBe(committed);
  });

  it('clears immediately on null and drops the pending frame', () => {
    const frames = createManualFrames();
    const store = new SwimlaneDragHoverStore(frames.scheduler);
    let notifications = 0;
    store.subscribe(() => {
      notifications++;
    });
    store.set(cell('a', 1));
    frames.flush();

    store.set(cell('a', 2));
    store.set(null);
    expect(frames.pendingCount).toBe(0);
    expect(store.getSnapshot()).toBeNull();
    expect(notifications).toBe(2);
  });

  it('does not notify when a frame ends on the already committed cell', () => {
    const frames = createManualFrames();
    const store = new SwimlaneDragHoverStore(frames.scheduler);
    let notifications = 0;
    store.subscribe(() => {
      notifications++;
    });
    store.set(cell('a', 1));
    frames.flush();
    const committed = store.getSnapshot();

    store.set(cell('a', 2));
    store.set(committed);
    frames.flush();
    expect(notifications).toBe(1);
  });

  it('reset clears latest and snapshot', () => {
    const frames = createManualFrames();
    const store = new SwimlaneDragHoverStore(frames.scheduler);
    store.set(cell('a', 1));
    store.reset();
    expect(store.getLatest()).toBeNull();
    expect(frames.pendingCount).toBe(0);
  });

  it('unsubscribe stops notifications', () => {
    const frames = createManualFrames();
    const store = new SwimlaneDragHoverStore(frames.scheduler);
    let notifications = 0;
    const unsubscribe = store.subscribe(() => {
      notifications++;
    });
    unsubscribe();
    store.set(cell('a', 1));
    frames.flush();
    expect(notifications).toBe(0);
  });

  describe('load', () => {
    it('coalesces a burst of 10k pointer moves into one notification per frame', () => {
      const frames = createManualFrames();
      const store = new SwimlaneDragHoverStore(frames.scheduler);
      let notifications = 0;
      store.subscribe(() => {
        notifications++;
      });

      const FRAMES = 100;
      const MOVES_PER_FRAME = 100;
      for (let frame = 0; frame < FRAMES; frame++) {
        for (let move = 0; move < MOVES_PER_FRAME; move++) {
          store.set(cell(`lane-${frame % 7}`, (frame * MOVES_PER_FRAME + move) % 30));
        }
        expect(frames.pendingCount).toBeLessThanOrEqual(1);
        frames.flush();
      }

      expect(notifications).toBeLessThanOrEqual(FRAMES);
    });

    it('fans out to 2k subscribers across 1k frames within budget', () => {
      const frames = createManualFrames();
      const store = new SwimlaneDragHoverStore(frames.scheduler);
      const LANES = 40;
      const SUBSCRIBERS_PER_LANE = 50;
      const laneChanges = new Array<number>(LANES).fill(0);
      const lastSeen = new Array<unknown>(LANES * SUBSCRIBERS_PER_LANE).fill(null);
      for (let lane = 0; lane < LANES; lane++) {
        const assigneeId = `lane-${lane}`;
        for (let i = 0; i < SUBSCRIBERS_PER_LANE; i++) {
          const slot = lane * SUBSCRIBERS_PER_LANE + i;
          store.subscribe(() => {
            const current = store.getSnapshot();
            const selected = current?.assigneeId === assigneeId ? current : null;
            if (selected !== lastSeen[slot]) {
              lastSeen[slot] = selected;
              if (i === 0) laneChanges[lane]!++;
            }
          });
        }
      }

      const started = performance.now();
      const FRAMES = 1000;
      for (let frame = 0; frame < FRAMES; frame++) {
        store.set(cell('lane-3', frame % 30));
        frames.flush();
      }
      const elapsed = performance.now() - started;

      expect(laneChanges[3]).toBe(FRAMES);
      expect(laneChanges.filter((_, lane) => lane !== 3).every((count) => count === 0)).toBe(true);
      expect(elapsed).toBeLessThan(1000);
    });
  });
});
