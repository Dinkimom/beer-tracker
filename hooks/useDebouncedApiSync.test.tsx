/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedApiSync } from './useDebouncedApiSync';

interface Row {
  id: string;
  v: number;
}

describe('useDebouncedApiSync', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('loads items when sprintId is valid', async () => {
    const fetchFn = vi.fn().mockResolvedValue([{ id: 'a', v: 1 }] as Row[]);
    const deleteFn = vi.fn().mockResolvedValue(true);
    const saveFn = vi.fn().mockResolvedValue(true);

    const { result } = renderHook(() =>
      useDebouncedApiSync<Row, string, Row>({
        sprintId: 10,
        debounceDelay: 50,
        deleteFn,
        fetchFn,
        getId: (x) => x.id,
        saveFn,
        toApiFormat: (x) => x,
      })
    );

    await waitFor(() => {
      expect(result.current[0]).toEqual([{ id: 'a', v: 1 }]);
    });
    expect(fetchFn).toHaveBeenCalledWith(10);
  });

  it('debounces saveItem so only the last pending update is sent', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn().mockResolvedValue([] as Row[]);
    const saveFn = vi.fn().mockResolvedValue(true);
    const deleteFn = vi.fn().mockResolvedValue(true);

    const { result } = renderHook(() =>
      useDebouncedApiSync<Row, string, Row>({
        sprintId: 1,
        debounceDelay: 300,
        deleteFn,
        fetchFn,
        getId: (x) => x.id,
        saveFn,
        toApiFormat: (x) => x,
      })
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchFn).toHaveBeenCalledWith(1);

    act(() => {
      result.current[2]({ id: 'x', v: 1 });
    });
    expect(saveFn).not.toHaveBeenCalled();

    let lastSave: Promise<void>;
    await act(() => {
      lastSave = result.current[2]({ id: 'x', v: 2 });
    });
    expect(saveFn).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    await act(async () => {
      await lastSave!;
    });

    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith(1, { id: 'x', v: 2 }, true);
  });

  it('uses batchSaveFn when several items are flushed together', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn().mockResolvedValue([] as Row[]);
    const saveFn = vi.fn().mockResolvedValue(true);
    const batchSaveFn = vi.fn().mockResolvedValue({ success: true, count: 2 });
    const deleteFn = vi.fn().mockResolvedValue(true);

    const { result } = renderHook(() =>
      useDebouncedApiSync<Row, string, Row>({
        sprintId: 2,
        debounceDelay: 100,
        batchSaveFn,
        deleteFn,
        fetchFn,
        getId: (x) => x.id,
        saveFn,
        toApiFormat: (x) => x,
      })
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchFn).toHaveBeenCalledWith(2);

    let lastSave: Promise<void>;
    act(() => {
      result.current[2]({ id: 'a', v: 1 });
      lastSave = result.current[2]({ id: 'b', v: 1 });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    await act(async () => {
      await lastSave!;
    });

    expect(batchSaveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).not.toHaveBeenCalled();
    expect(batchSaveFn.mock.calls[0]?.[1]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'a', v: 1 }),
        expect.objectContaining({ id: 'b', v: 1 }),
      ])
    );
  });

  it('does not call save when sprintId is invalid', async () => {
    const fetchFn = vi.fn().mockResolvedValue([] as Row[]);
    const saveFn = vi.fn().mockResolvedValue(true);
    const deleteFn = vi.fn().mockResolvedValue(true);

    const { result } = renderHook(() =>
      useDebouncedApiSync<Row, string, Row>({
        sprintId: null,
        debounceDelay: 20,
        deleteFn,
        fetchFn,
        getId: (x) => x.id,
        saveFn,
        toApiFormat: (x) => x,
      })
    );

    await act(async () => {
      await result.current[2]({ id: 'x', v: 1 });
    });
    expect(saveFn).not.toHaveBeenCalled();
  });

  it('reloadFromRemote keeps pending local edits', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce([{ id: 'a', v: 1 }] as Row[])
      .mockResolvedValueOnce([
        { id: 'a', v: 50 },
        { id: 'b', v: 2 },
      ] as Row[]);
    const saveFn = vi.fn().mockResolvedValue(true);
    const deleteFn = vi.fn().mockResolvedValue(true);

    const { result } = renderHook(() =>
      useDebouncedApiSync<Row, string, Row>({
        sprintId: 4,
        debounceDelay: 5_000,
        deleteFn,
        fetchFn,
        getId: (x) => x.id,
        saveFn,
        toApiFormat: (x) => x,
      })
    );

    await waitFor(() => {
      expect(result.current[0]).toEqual([{ id: 'a', v: 1 }]);
    });

    act(() => {
      result.current[2]({ id: 'a', v: 9 });
    });
    expect(result.current[0]).toEqual([{ id: 'a', v: 9 }]);

    await act(async () => {
      await result.current[4]();
    });

    expect(result.current[0]).toEqual([
      { id: 'b', v: 2 },
      { id: 'a', v: 9 },
    ]);
    expect(saveFn).not.toHaveBeenCalled();
  });

  it('does not restore a deleted item from a stale remote snapshot', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce([
        { id: 'a', v: 1 },
        { id: 'b', v: 2 },
      ] as Row[])
      .mockResolvedValueOnce([
        { id: 'a', v: 1 },
        { id: 'b', v: 2 },
      ] as Row[]);
    const saveFn = vi.fn().mockResolvedValue(true);
    const deleteFn = vi.fn().mockResolvedValue(true);

    const { result } = renderHook(() =>
      useDebouncedApiSync<Row, string, Row>({
        sprintId: 5,
        debounceDelay: 5_000,
        deleteFn,
        fetchFn,
        getId: (x) => x.id,
        saveFn,
        toApiFormat: (x) => x,
      })
    );

    await waitFor(() => {
      expect(result.current[0]).toEqual([
        { id: 'a', v: 1 },
        { id: 'b', v: 2 },
      ]);
    });

    await act(async () => {
      await result.current[3]('a');
    });
    expect(result.current[0]).toEqual([{ id: 'b', v: 2 }]);

    await act(async () => {
      await result.current[4]();
    });

    expect(result.current[0]).toEqual([{ id: 'b', v: 2 }]);
    expect(deleteFn).toHaveBeenCalledWith(5, 'a');
  });

  it('does not reset local edits when getInitialItems identity changes on rerender', async () => {
    const fetchFn = vi.fn().mockResolvedValue([{ id: 'a', v: 1 }] as Row[]);
    const deleteFn = vi.fn().mockResolvedValue(true);
    const saveFn = vi.fn().mockResolvedValue(true);
    const prefetched = [{ id: 'a', v: 1 }];
    let initialItemsVersion = 0;

    const { result, rerender } = renderHook(
      ({ getInitialItems }) =>
        useDebouncedApiSync<Row, string, Row>({
          sprintId: 10,
          debounceDelay: 5_000,
          deleteFn,
          fetchFn,
          getId: (x) => x.id,
          getInitialItems,
          saveFn,
          toApiFormat: (x) => x,
        }),
      {
        initialProps: {
          getInitialItems: () => {
            initialItemsVersion += 1;
            return initialItemsVersion === 1 ? prefetched : undefined;
          },
        },
      }
    );

    await waitFor(() => {
      expect(result.current[0]).toEqual([{ id: 'a', v: 1 }]);
    });
    expect(fetchFn).not.toHaveBeenCalled();

    act(() => {
      result.current[1]([{ id: 'a', v: 99 }]);
    });
    expect(result.current[0]).toEqual([{ id: 'a', v: 99 }]);

    rerender({
      getInitialItems: () => {
        initialItemsVersion += 1;
        return prefetched;
      },
    });

    expect(result.current[0]).toEqual([{ id: 'a', v: 99 }]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('consumes prefetch that settles after the first miss while items are still empty', async () => {
    const fetchFn = vi.fn().mockReturnValue(new Promise<Row[]>(() => undefined));
    const deleteFn = vi.fn().mockResolvedValue(true);
    const saveFn = vi.fn().mockResolvedValue(true);
    const prefetchBox: { current: Row[] | undefined } = { current: undefined };

    const { result, rerender } = renderHook(
      ({ getInitialItems }) =>
        useDebouncedApiSync<Row, string, Row>({
          sprintId: 11,
          debounceDelay: 5_000,
          deleteFn,
          fetchFn,
          getId: (x) => x.id,
          getInitialItems,
          saveFn,
          toApiFormat: (x) => x,
        }),
      {
        initialProps: {
          getInitialItems: () => prefetchBox.current,
        },
      }
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current[0]).toEqual([]);
    expect(fetchFn).toHaveBeenCalledWith(11);

    prefetchBox.current = [{ id: 'late', v: 2 }];
    rerender({
      getInitialItems: () => prefetchBox.current,
    });

    expect(result.current[0]).toEqual([{ id: 'late', v: 2 }]);
  });

  it('awaits an in-flight prefetch instead of starting a duplicate fetch', async () => {
    let resolveInflight = (_value: Row[]): void => undefined;
    const inflight = new Promise<Row[]>((resolve) => {
      resolveInflight = resolve;
    });
    const fetchFn = vi.fn().mockResolvedValue([{ id: 'fallback', v: 0 }] as Row[]);
    const deleteFn = vi.fn().mockResolvedValue(true);
    const saveFn = vi.fn().mockResolvedValue(true);

    const { result } = renderHook(() =>
      useDebouncedApiSync<Row, string, Row>({
        sprintId: 12,
        debounceDelay: 5_000,
        deleteFn,
        fetchFn,
        getId: (x) => x.id,
        getInflightItems: () => inflight,
        saveFn,
        toApiFormat: (x) => x,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current[0]).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();

    await act(async () => {
      resolveInflight([{ id: 'from-prefetch', v: 3 }]);
      await inflight;
    });

    expect(result.current[0]).toEqual([{ id: 'from-prefetch', v: 3 }]);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
