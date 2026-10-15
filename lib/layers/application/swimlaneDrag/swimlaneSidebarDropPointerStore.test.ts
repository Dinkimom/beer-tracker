import { describe, expect, it } from 'vitest';

import { SwimlaneSidebarDropPointerStore } from './swimlaneSidebarDropPointerStore';

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

describe('SwimlaneSidebarDropPointerStore', () => {
  it('exposes the latest Y synchronously and commits once per frame', () => {
    const frames = createManualFrames();
    const store = new SwimlaneSidebarDropPointerStore(frames.scheduler);
    let notifications = 0;
    store.subscribe(() => {
      notifications++;
    });

    store.set(10);
    store.set(20);
    store.set(30);

    expect(store.getLatest()).toBe(30);
    expect(store.getSnapshot()).toBeNull();
    expect(frames.pendingCount).toBe(1);

    frames.flush();
    expect(store.getSnapshot()).toBe(30);
    expect(notifications).toBe(1);
  });

  it('ignores the same Y and does not schedule a frame', () => {
    const frames = createManualFrames();
    const store = new SwimlaneSidebarDropPointerStore(frames.scheduler);
    store.set(42);
    frames.flush();
    const committed = store.getSnapshot();

    store.set(42);
    expect(frames.pendingCount).toBe(0);
    expect(store.getSnapshot()).toBe(committed);
  });

  it('clears immediately on null and drops the pending frame', () => {
    const frames = createManualFrames();
    const store = new SwimlaneSidebarDropPointerStore(frames.scheduler);
    let notifications = 0;
    store.subscribe(() => {
      notifications++;
    });
    store.set(10);
    frames.flush();

    store.set(20);
    store.set(null);
    expect(frames.pendingCount).toBe(0);
    expect(store.getLatest()).toBeNull();
    expect(store.getSnapshot()).toBeNull();
    expect(notifications).toBe(2);
  });
});
