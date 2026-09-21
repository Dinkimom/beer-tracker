import type { AxiosInstance } from 'axios';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiCache, cacheKeys } from '@/lib/cache';

import { fetchTrackerQueueByKey, searchTrackerQueues } from './queues';

describe('searchTrackerQueues', () => {
  it('returns queue fetched by exact key', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: { key: 'NW', name: 'New Widget' } })
      .mockResolvedValueOnce({ data: [] });
    const api = { get } as Pick<AxiosInstance, 'get'>;

    const items = await searchTrackerQueues('NW', api as AxiosInstance);

    expect(items).toEqual([{ id: undefined, key: 'NW', name: 'New Widget' }]);
    expect(get).toHaveBeenCalledWith(
      'https://api.tracker.yandex.net/v3/queues/NW'
    );
  });

  it('filters organization queues by substring when direct fetch misses', async () => {
    const get = vi
      .fn()
      .mockRejectedValueOnce(new Error('404'))
      .mockRejectedValueOnce(new Error('404'))
      .mockResolvedValueOnce({
        data: [
          { key: 'NW', name: 'New Widget' },
          { key: 'HR', name: 'HR docs' },
        ],
      });
    const api = { get } as Pick<AxiosInstance, 'get'>;

    const items = await searchTrackerQueues('widget', api as AxiosInstance);

    expect(items).toEqual([{ id: undefined, key: 'NW', name: 'New Widget' }]);
  });
});

describe('fetchTrackerQueueByKey', () => {
  afterEach(() => {
    apiCache.delete(cacheKeys.queueByKey('POG'));
    apiCache.delete(cacheKeys.queueByKey('NW'));
  });

  it('maps queue response', async () => {
    const get = vi.fn().mockResolvedValue({ data: { key: 'POG', name: 'Порог входа' } });
    const api = { get } as Pick<AxiosInstance, 'get'>;

    await expect(fetchTrackerQueueByKey('POG', api as AxiosInstance)).resolves.toEqual({
      id: undefined,
      key: 'POG',
      name: 'Порог входа',
    });
  });

  it('reuses server cache for repeated lookups', async () => {
    const get = vi.fn().mockResolvedValue({ data: { key: 'NW', name: 'New Widget' } });
    const api = { get } as Pick<AxiosInstance, 'get'>;

    await fetchTrackerQueueByKey('NW', api as AxiosInstance);
    await fetchTrackerQueueByKey('nw', api as AxiosInstance);

    expect(get).toHaveBeenCalledTimes(1);
  });
});
