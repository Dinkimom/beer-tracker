import type { TaskPosition } from '@/types';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchSprintLaneLayers, fetchSprintPositions, saveSprintLaneLayers } from '@/lib/beerTrackerApi';
import { DELAYS } from '@/utils/constants';

import { TaskPositionsStore } from './taskPositionsStore';

vi.mock('@/lib/beerTrackerApi', async (importOriginal) => {
  const actual = await importOriginal();
  return Object.assign({}, actual, {
    fetchPlanPatchPositionPreviews: vi.fn().mockResolvedValue([]),
    fetchSprintLaneLayers: vi.fn().mockResolvedValue([]),
    fetchSprintPlanAnchors: vi.fn().mockResolvedValue([]),
    fetchSprintPositions: vi.fn().mockResolvedValue([]),
    saveSprintLaneLayers: vi.fn().mockResolvedValue(undefined),
    saveTaskPosition: vi.fn().mockResolvedValue(undefined),
  });
});

const mockSaveLayers = vi.mocked(saveSprintLaneLayers);

function pos(id: string, startDay = 0): TaskPosition {
  return { assignee: 'dev1', duration: 2, startDay, startPart: 0, taskId: id };
}

async function loadedStore(): Promise<TaskPositionsStore> {
  const store = new TaskPositionsStore();
  await store.loadSprint(7);
  return store;
}

describe('SwimlaneLaneLayersStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies layers locally and persists them in one debounced request', async () => {
    const store = await loadedStore();
    store.laneLayers.set([
      { cardId: 'T-1', layer: 2 },
      { cardId: 'comment:n1', layer: 0 },
    ]);
    expect(store.laneLayers.get('T-1')).toBe(2);
    expect(mockSaveLayers).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(DELAYS.DEBOUNCE);

    expect(mockSaveLayers).toHaveBeenCalledTimes(1);
    expect(mockSaveLayers).toHaveBeenCalledWith(7, [
      { cardId: 'T-1', layer: 2 },
      { cardId: 'comment:n1', layer: 0 },
    ]);
  });

  it('keeps quick-add drafts local', async () => {
    const store = await loadedStore();
    store.laneLayers.set([{ cardId: 'local-task-1', layer: 1 }]);
    await vi.advanceTimersByTimeAsync(DELAYS.DEBOUNCE);
    expect(store.laneLayers.get('local-task-1')).toBe(1);
    expect(mockSaveLayers).not.toHaveBeenCalled();
  });

  it('records a standalone undo step when no position changes in the same handler', async () => {
    const store = await loadedStore();
    store.laneLayers.set([{ cardId: 'T-1', layer: 3 }], { recordHistory: true });
    await Promise.resolve();
    expect(store.canUndo).toBe(true);

    store.undo();
    expect(store.laneLayers.get('T-1')).toBeUndefined();
    store.redo();
    expect(store.laneLayers.get('T-1')).toBe(3);
  });

  it('merges a drop layer into the position step so one undo reverts both', async () => {
    const store = await loadedStore();
    await store.savePosition(pos('T-1', 0), false, undefined, true, { recordHistory: true });

    store.laneLayers.set([{ cardId: 'T-1', layer: 1 }], { recordHistory: true });
    await store.savePosition(pos('T-1', 3), false, undefined, true, { recordHistory: true });
    await Promise.resolve();

    store.undo();
    expect(store.positions.get('T-1')?.startDay).toBe(0);
    expect(store.laneLayers.get('T-1')).toBeUndefined();
    expect(store.canUndo).toBe(true);
  });

  it('makes a moved card the newest so it yields on conflicts', async () => {
    const store = await loadedStore();
    store.laneLayers.set([
      { cardId: 'T-1', layer: 0 },
      { cardId: 'T-2', layer: 0 },
    ]);
    const before = store.laneLayers.layers.get('T-1')!.rev;
    await store.savePosition(pos('T-1', 4), false, undefined, true);
    const t1 = store.laneLayers.layers.get('T-1')!;
    expect(t1.layer).toBe(0);
    expect(t1.rev).toBeGreaterThan(before);
    expect(t1.rev).toBeGreaterThan(store.laneLayers.layers.get('T-2')!.rev);
  });

  it('keeps unsent local layers on top of a server reconcile', async () => {
    vi.mocked(fetchSprintLaneLayers).mockResolvedValueOnce([]);
    const store = await loadedStore();
    store.laneLayers.set([{ cardId: 'T-1', layer: 4 }]);
    vi.mocked(fetchSprintPositions).mockResolvedValueOnce([]);
    vi.mocked(fetchSprintLaneLayers).mockResolvedValueOnce([
      { cardId: 'T-1', layer: 0, rev: 1 },
      { cardId: 'T-2', layer: 1, rev: 1 },
    ]);

    await store.reconcileRemoteSprint(7);

    expect(store.laneLayers.get('T-1')).toBe(4);
    expect(store.laneLayers.get('T-2')).toBe(1);
  });

  it('gives newly seen cards later auto-order numbers', async () => {
    const store = await loadedStore();
    const first = store.laneLayers.autoOrderFor(['a', 'b']);
    expect(first.get('a')).toBe(0);
    const next = store.laneLayers.autoOrderFor(['c', 'a', 'b']);
    expect(next.get('c')).toBe(2);
    expect(next.get('a')).toBe(0);
  });
});
