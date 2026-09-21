import type { AxiosInstance } from 'axios';

import { describe, expect, it, vi } from 'vitest';

import { fetchTrackerQueuesPaginate } from './queues';

describe('fetchTrackerQueuesPaginate', () => {
  it('uses GET /v3/queues/ with perPage, not _paginate', async () => {
    const get = vi.fn().mockResolvedValue({
      data: [
        { id: '3', key: 'TEST', name: 'Test queue' },
        { id: 4, key: 'OTHER', name: 'Other' },
      ],
    });
    const api = { get } as Pick<AxiosInstance, 'get'>;
    await fetchTrackerQueuesPaginate(api as AxiosInstance);
    expect(get).toHaveBeenCalledWith(
      'https://api.tracker.yandex.net/v3/queues/',
      expect.objectContaining({
        params: { perPage: 500 },
      })
    );
  });

  it('accepts values wrapper', async () => {
    const get = vi.fn().mockResolvedValue({
      data: { values: [{ key: 'K', name: 'N' }] },
    });
    const api = { get } as Pick<AxiosInstance, 'get'>;
    const rows = await fetchTrackerQueuesPaginate(api as AxiosInstance);
    expect(rows).toEqual([{ id: undefined, key: 'K', name: 'N' }]);
  });
});
