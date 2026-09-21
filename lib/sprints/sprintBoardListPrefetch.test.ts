import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearSprintBoardListPrefetchForTests,
  getInflightSprintBoardList,
  isSprintBoardListPrefetchSettled,
  prefetchSprintBoardList,
  takePrefetchedSprintBoardList,
} from './sprintBoardListPrefetch';

describe('sprintBoardListPrefetch', () => {
  afterEach(() => {
    clearSprintBoardListPrefetchForTests();
  });

  it('deduplicates in-flight prefetch for the same sprint and kind', async () => {
    const fetchFn = vi.fn(() => Promise.resolve([{ id: 'c1' }]));

    const [first, second] = await Promise.all([
      prefetchSprintBoardList(42, 'comments', fetchFn),
      prefetchSprintBoardList(42, 'comments', fetchFn),
    ]);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(first).toEqual([{ id: 'c1' }]);
    expect(second).toEqual([{ id: 'c1' }]);
    expect(isSprintBoardListPrefetchSettled(42, 'comments')).toBe(true);
    expect(takePrefetchedSprintBoardList(42, 'comments')).toEqual([{ id: 'c1' }]);
    expect(isSprintBoardListPrefetchSettled(42, 'comments')).toBe(false);
    expect(takePrefetchedSprintBoardList(42, 'comments')).toBeUndefined();
  });

  it('keeps separate cache entries per sprint and kind', async () => {
    const commentsFetch = vi.fn((sprintId: number) => Promise.resolve([{ id: `comment-${sprintId}` }]));
    const linksFetch = vi.fn((sprintId: number) => Promise.resolve([{ id: `link-${sprintId}` }]));

    await prefetchSprintBoardList(1, 'comments', commentsFetch);
    await prefetchSprintBoardList(1, 'links', linksFetch);
    await prefetchSprintBoardList(2, 'comments', commentsFetch);

    expect(takePrefetchedSprintBoardList(1, 'comments')).toEqual([{ id: 'comment-1' }]);
    expect(takePrefetchedSprintBoardList(1, 'links')).toEqual([{ id: 'link-1' }]);
    expect(takePrefetchedSprintBoardList(2, 'comments')).toEqual([{ id: 'comment-2' }]);
    expect(takePrefetchedSprintBoardList(2, 'links')).toBeUndefined();
  });

  it('exposes the in-flight prefetch promise until it settles', async () => {
    let resolveFetch = (_value: Array<{ id: string }>): void => undefined;
    const fetchFn = vi.fn(
      () =>
        new Promise<Array<{ id: string }>>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const prefetchPromise = prefetchSprintBoardList(7, 'links', fetchFn);
    const inflight = getInflightSprintBoardList<{ id: string }>(7, 'links');
    expect(inflight).toBe(prefetchPromise);

    resolveFetch([{ id: 'link-7' }]);
    await expect(prefetchPromise).resolves.toEqual([{ id: 'link-7' }]);
    expect(getInflightSprintBoardList(7, 'links')).toBeUndefined();
    expect(isSprintBoardListPrefetchSettled(7, 'links')).toBe(true);
  });
});
