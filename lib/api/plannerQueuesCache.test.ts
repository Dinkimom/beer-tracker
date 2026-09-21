import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearPlannerQueuesClientCache,
  peekCachedQueueByKey,
  peekCachedQueueIssueTypes,
  runCachedQueueByKeyFetch,
  runCachedQueueIssueTypesFetch,
  setCachedQueueByKey,
} from './plannerQueuesCache';

describe('plannerQueuesCache', () => {
  afterEach(() => {
    clearPlannerQueuesClientCache();
    vi.restoreAllMocks();
  });

  it('returns cached queue metadata without calling fetcher', async () => {
    setCachedQueueByKey('nw', { key: 'NW', name: 'New Widget' });
    const fetcher = vi.fn();

    await expect(runCachedQueueByKeyFetch('NW', fetcher)).resolves.toEqual({
      key: 'NW',
      name: 'New Widget',
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(peekCachedQueueByKey('nw')).toEqual({ key: 'NW', name: 'New Widget' });
  });

  it('deduplicates concurrent queue fetches', async () => {
    let resolve!: (value: { key: string; name: string }) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<{ key: string; name: string }>((res) => {
          resolve = res;
        })
    );

    const first = runCachedQueueByKeyFetch('HR', fetcher);
    const second = runCachedQueueByKeyFetch('hr', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    resolve({ key: 'HR', name: 'HR docs' });
    await expect(Promise.all([first, second])).resolves.toEqual([
      { key: 'HR', name: 'HR docs' },
      { key: 'HR', name: 'HR docs' },
    ]);
  });

  it('caches issue types per queue', async () => {
    const types = [{ key: 'task', label: 'Задача' }];
    const fetcher = vi.fn().mockResolvedValue(types);

    await expect(runCachedQueueIssueTypesFetch('NW', fetcher)).resolves.toEqual(types);
    await expect(runCachedQueueIssueTypesFetch('NW', fetcher)).resolves.toEqual(types);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(peekCachedQueueIssueTypes('NW')).toEqual(types);
  });
});
