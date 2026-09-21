import type { TaskPosition } from '@/types';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteTaskPosition, fetchSprintPositions, saveTaskPosition } from '@/lib/beerTrackerApi';

import { TaskPositionsStore } from './taskPositionsStore';

vi.mock('@/lib/beerTrackerApi', async (importOriginal) => {
  const actual = await importOriginal();
  return Object.assign({}, actual, {
    fetchSprintPositions: vi.fn(),
    deleteTaskPosition: vi.fn().mockResolvedValue(true),
    saveTaskPosition: vi.fn().mockResolvedValue(undefined),
    saveTaskPositionsBatch: vi.fn().mockResolvedValue(undefined),
  });
});

const mockFetch = vi.mocked(fetchSprintPositions);
const mockDelete = vi.mocked(deleteTaskPosition);
const mockSave = vi.mocked(saveTaskPosition);

function pos(id: string, startDay = 0): TaskPosition {
  return {
    assignee: 'dev1',
    duration: 3,
    startDay,
    startPart: 0,
    taskId: id,
  };
}

describe('TaskPositionsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('undo вызывает onPlanHistoryApplied с восстановленными позициями', async () => {
    mockFetch.mockResolvedValue([]);

    const store = new TaskPositionsStore();
    await store.loadSprint(42);

    const handler = vi.fn();
    store.setOnPlanHistoryApplied(handler);

    await store.savePosition(pos('t1', 2), false, undefined, true, { recordHistory: true });
    await store.savePosition(pos('t1', 5), false, undefined, true, { recordHistory: true });

    handler.mockClear();
    store.undo();

    expect(handler).toHaveBeenCalledTimes(1);
    const payload = handler.mock.calls[0]![0];
    expect(payload.saves).toHaveLength(1);
    expect(payload.saves[0]!.position.taskId).toBe('t1');
    expect(payload.saves[0]!.position.startDay).toBe(2);

    store.setOnPlanHistoryApplied(undefined);
  });

  it('устаревший ответ fetchSprintPositions после локального savePosition не затирает карту', async () => {
    let resolveFetch!: (value: TaskPosition[]) => void;
    const fetchPromise = new Promise<TaskPosition[]>((r) => {
      resolveFetch = r;
    });
    mockFetch.mockReturnValue(fetchPromise);

    const store = new TaskPositionsStore();
    const loadPromise = store.loadSprint(42);

    await Promise.resolve();

    store.savePosition(pos('after-drag', 5), false, undefined, true);

    expect(store.positions.get('after-drag')?.startDay).toBe(5);

    resolveFetch([pos('from-server', 0)]);

    await loadPromise;

    expect(store.positions.get('after-drag')?.startDay).toBe(5);
    expect(store.positions.has('from-server')).toBe(false);
  });

  it('устаревший ответ fetch после setPositionsWithSave не затирает карту', async () => {
    let resolveFetch!: (value: TaskPosition[]) => void;
    const fetchPromise = new Promise<TaskPosition[]>((r) => {
      resolveFetch = r;
    });
    mockFetch.mockReturnValue(fetchPromise);

    const store = new TaskPositionsStore();
    const loadPromise = store.loadSprint(42);

    await Promise.resolve();

    const m = new Map<string, TaskPosition>();
    m.set('t1', pos('t1', 7));
    store.setPositionsWithSave(m);

    expect(store.positions.get('t1')?.startDay).toBe(7);

    resolveFetch([pos('stale', 0)]);

    await loadPromise;

    expect(store.positions.get('t1')?.startDay).toBe(7);
    expect(store.positions.has('stale')).toBe(false);
  });

  it('актуальный ответ fetch применяется, если не было мутаций после старта загрузки', async () => {
    mockFetch.mockResolvedValue([pos('a', 1), pos('b', 2)]);

    const store = new TaskPositionsStore();
    await store.loadSprint(42);

    expect(store.positions.size).toBe(2);
    expect(store.positions.get('a')?.startDay).toBe(1);
  });

  it('positionsLoadPending и positionsSettledSprintId отражают завершение загрузки', async () => {
    let resolveFetch!: (value: TaskPosition[]) => void;
    const fetchPromise = new Promise<TaskPosition[]>((r) => {
      resolveFetch = r;
    });
    mockFetch.mockReturnValue(fetchPromise);

    const store = new TaskPositionsStore();
    const done = store.loadSprint(42);

    await Promise.resolve();
    expect(store.positionsLoadPending).toBe(true);
    expect(store.positionsSettledSprintId).toBe(null);

    resolveFetch([]);
    await done;

    expect(store.positionsLoadPending).toBe(false);
    expect(store.positionsSettledSprintId).toBe(42);
  });

  it('повторный loadSprint для того же спринта без in-flight не дергает API (нет цикла с монтированием планера)', async () => {
    mockFetch.mockResolvedValue([pos('a', 1)]);

    const store = new TaskPositionsStore();
    await store.loadSprint(42);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await store.loadSprint(42);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('хранит последние пять шагов плана и умеет undo/redo без персистентности', async () => {
    mockFetch.mockResolvedValue([]);

    const store = new TaskPositionsStore();
    await store.loadSprint(42);

    for (let i = 0; i < 6; i++) {
      await store.savePosition(pos('t1', i), false, undefined, true, { recordHistory: true });
    }

    expect(store.undoStack.length).toBe(5);
    expect(store.canUndo).toBe(true);
    expect(store.canRedo).toBe(false);
    expect(store.positions.get('t1')?.startDay).toBe(5);

    store.undo();
    expect(store.positions.get('t1')?.startDay).toBe(4);
    expect(store.canRedo).toBe(true);

    store.redo();
    expect(store.positions.get('t1')?.startDay).toBe(5);
    expect(mockSave).toHaveBeenCalled();
  });

  it('undo удаления возвращает позицию, redo снова удаляет её', async () => {
    mockFetch.mockResolvedValue([pos('t1', 2)]);

    const store = new TaskPositionsStore();
    await store.loadSprint(42);

    await store.deletePosition('t1', { recordHistory: true });
    expect(store.positions.has('t1')).toBe(false);

    store.undo();
    expect(store.positions.get('t1')?.startDay).toBe(2);

    store.redo();
    expect(store.positions.has('t1')).toBe(false);
    expect(mockDelete).toHaveBeenCalledWith(42, 't1');
  });

  it('reconcileRemoteSprint подменяет карту, но не затирает pending-правки', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValueOnce([]);
    const store = new TaskPositionsStore();
    await store.loadSprint(42);

    store.savePosition(pos('local', 4), false, undefined, false);
    expect(store.positions.get('local')?.startDay).toBe(4);

    mockFetch.mockResolvedValueOnce([pos('remote', 1), pos('local', 99)]);
    await store.reconcileRemoteSprint(42);

    expect(store.positions.get('local')?.startDay).toBe(4);
    expect(store.positions.get('remote')?.startDay).toBe(1);
    expect(store.positionsLoadPending).toBe(false);
    vi.useRealTimers();
  });

  it('immediate savePosition не оставляет задачу в pending, чтобы remote reconcile подтянул startDay', async () => {
    mockFetch.mockResolvedValueOnce([]);
    const store = new TaskPositionsStore();
    await store.loadSprint(42);

    store.savePosition(pos('t1', 4), false, undefined, false);
    await store.savePosition(pos('t1', 1), false, undefined, true);

    mockFetch.mockResolvedValueOnce([pos('t1', 1)]);
    await store.reconcileRemoteSprint(42);

    expect(store.positions.get('t1')?.startDay).toBe(1);
    expect(mockSave).toHaveBeenCalled();
  });

  it('comment-only шаг включает canUndo и отдаёт comments в onPlanHistoryApplied', async () => {
    mockFetch.mockResolvedValue([]);
    const store = new TaskPositionsStore();
    await store.loadSprint(42);

    const handler = vi.fn();
    store.setOnPlanHistoryApplied(handler);

    const before = {
      assigneeId: 'dev1',
      day: 0,
      height: 1,
      part: 0,
      width: 2,
      x: 0,
      y: 0,
    };
    const after = { ...before, day: 3, part: 1 };
    store.recordPlanHistory({
      after: new Map(),
      before: new Map(),
      comments: new Map([['c1', { after, before }]]),
    });

    expect(store.canUndo).toBe(true);
    handler.mockClear();
    store.undo();

    expect(handler).toHaveBeenCalledTimes(1);
    const payload = handler.mock.calls[0]![0];
    expect(payload.comments?.get('c1')).toEqual(before);
    expect(payload.saves).toHaveLength(0);

    store.setOnPlanHistoryApplied(undefined);
  });

  it('шаг с taskParents отдаёт родителя при undo/redo', async () => {
    mockFetch.mockResolvedValue([]);
    const store = new TaskPositionsStore();
    await store.loadSprint(42);

    const handler = vi.fn();
    store.setOnPlanHistoryApplied(handler);

    const parentA = { display: 'A', id: 'a', key: 'A-1' };
    const parentB = { display: 'B', id: 'b', key: 'B-1' };

    await store.savePosition(pos('t1', 2), false, undefined, true, {
      recordHistory: true,
      sideEffects: {
        taskParents: new Map([['t1', { after: parentB, before: parentA }]]),
      },
    });

    handler.mockClear();
    store.undo();
    expect(handler.mock.calls[0]![0].taskParents?.get('t1')).toEqual(parentA);

    handler.mockClear();
    store.redo();
    expect(handler.mock.calls[0]![0].taskParents?.get('t1')).toEqual(parentB);

    store.setOnPlanHistoryApplied(undefined);
  });
});
