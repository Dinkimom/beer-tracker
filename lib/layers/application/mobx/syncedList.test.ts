import { afterEach, describe, expect, it, vi } from 'vitest';

import { SyncedList, type SyncedListConfig } from './syncedList';

interface Row {
  id: string;
  v: number;
}

function list(sprintId: number | null, overrides: Partial<SyncedListConfig<Row, string, Row>> = {}) {
  const config: SyncedListConfig<Row, string, Row> = {
    debounceDelay: 100,
    deleteFn: vi.fn().mockResolvedValue(true),
    fetchFn: vi.fn().mockResolvedValue([]),
    getId: (row) => row.id,
    saveFn: vi.fn().mockResolvedValue(true),
    toApiFormat: (row) => row,
    ...overrides,
  };
  return { config, items: new SyncedList<Row, string, Row>(sprintId, config) };
}

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('SyncedList', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('загружает список спринта при connect', async () => {
    const { config, items } = list(10, { fetchFn: vi.fn().mockResolvedValue([{ id: 'a', v: 1 }]) });
    items.connect();
    await flush();
    expect(items.items).toEqual([{ id: 'a', v: 1 }]);
    expect(config.fetchFn).toHaveBeenCalledWith(10);
  });

  it('save показывает правку сразу и пишет только последнюю после паузы', async () => {
    vi.useFakeTimers();
    const { config, items } = list(1);
    // Промис затёртого сохранения не разрешается (как у хука) — его не ждём.
    items.save({ id: 'x', v: 1 }).catch(() => undefined);
    const last = items.save({ id: 'x', v: 2 });
    expect(items.items).toEqual([{ id: 'x', v: 2 }]);
    expect(config.saveFn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    await last;
    expect(config.saveFn).toHaveBeenCalledTimes(1);
    expect(config.saveFn).toHaveBeenCalledWith(1, { id: 'x', v: 2 }, true);
  });

  it('несколько правок уходят одним пакетом', async () => {
    vi.useFakeTimers();
    const batchSaveFn = vi.fn().mockResolvedValue({ count: 2, success: true });
    const { config, items } = list(2, { batchSaveFn });
    items.save({ id: 'a', v: 1 }).catch(() => undefined);
    const last = items.save({ id: 'b', v: 1 });
    await vi.advanceTimersByTimeAsync(100);
    await last;
    expect(batchSaveFn).toHaveBeenCalledTimes(1);
    expect(config.saveFn).not.toHaveBeenCalled();
  });

  it('без спринта ничего не пишет', async () => {
    const { config, items } = list(null);
    await items.save({ id: 'a', v: 1 });
    items.setWithSave([{ id: 'b', v: 1 }]);
    expect(config.saveFn).not.toHaveBeenCalled();
  });

  it('setWithSave пишет только изменившиеся элементы', async () => {
    vi.useFakeTimers();
    const { config, items } = list(3, {
      fetchFn: vi.fn().mockResolvedValue([
        { id: 'a', v: 1 },
        { id: 'b', v: 1 },
      ]),
    });
    items.connect();
    await vi.advanceTimersByTimeAsync(0);
    items.setWithSave((prev) => prev.map((row) => (row.id === 'b' ? { ...row, v: 2 } : row)));
    await vi.advanceTimersByTimeAsync(100);
    expect(config.saveFn).toHaveBeenCalledTimes(1);
    expect(config.saveFn).toHaveBeenCalledWith(3, { id: 'b', v: 2 }, true);
  });

  it('снимок из realtime не затирает ожидающую правку и не возвращает удалённое', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn().mockResolvedValue([
      { id: 'a', v: 1 },
      { id: 'b', v: 1 },
    ]);
    const { items } = list(4, { fetchFn });
    items.connect();
    await vi.advanceTimersByTimeAsync(0);
    items.save({ id: 'a', v: 5 }).catch(() => undefined);
    await items.delete('b');
    await items.reloadFromRemote();
    expect(items.items).toEqual([{ id: 'a', v: 5 }]);
  });

  it('повторный connect подхватывает префетч, пришедший позже', async () => {
    const prefetch: { rows?: Row[] } = {};
    const { items } = list(5, {
      fetchFn: vi.fn().mockResolvedValue([]),
      getInitialItems: () => prefetch.rows,
    });
    items.connect();
    await flush();
    prefetch.rows = [{ id: 'late', v: 1 }];
    items.connect();
    expect(items.items).toEqual([{ id: 'late', v: 1 }]);
  });
});
