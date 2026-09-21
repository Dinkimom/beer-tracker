import type { SprintInfo } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import { describe, expect, it, vi } from 'vitest';

import { updateTrackerSprintStatus } from './sprints';

function sprint(overrides: Partial<SprintInfo> = {}): SprintInfo {
  return {
    id: 1868,
    name: 'Sprint',
    status: 'draft',
    startDate: '2026-05-01',
    endDate: '2026-05-14',
    startDateTime: '2026-05-01T00:00:00.000+0000',
    endDateTime: '2026-05-14T00:00:00.000+0000',
    version: 1,
    ...overrides,
  };
}

describe('updateTrackerSprintStatus', () => {
  it('retries with current sprint version after Tracker 412 conflict', async () => {
    const patch = vi.fn()
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 412 } })
      .mockResolvedValueOnce({
        data: {
          ...sprint({ status: 'archived', version: 8 }),
          board: { id: '42' },
        },
      });
    const get = vi.fn().mockResolvedValueOnce({
      data: {
        ...sprint({ status: 'draft', version: 7 }),
        board: { id: '42' },
      },
    });
    const api = { get, patch } as Pick<AxiosInstance, 'get' | 'patch'>;

    const result = await updateTrackerSprintStatus(1868, 'archived', 6, api as AxiosInstance);

    expect(result).toEqual({
      ...sprint({ status: 'archived', version: 8 }),
      boardId: 42,
    });
    expect(get).toHaveBeenCalledWith('/sprints/1868');
    expect(patch).toHaveBeenNthCalledWith(
      1,
      '/sprints/1868',
      { status: 'archived' },
      { headers: { 'If-Match': '"6"' } }
    );
    expect(patch).toHaveBeenNthCalledWith(
      2,
      '/sprints/1868',
      { status: 'archived' },
      { headers: { 'If-Match': '"7"' } }
    );
  });

  it('returns current sprint when 412 response means the status already changed', async () => {
    const patch = vi.fn()
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 412 } });
    const get = vi.fn().mockResolvedValueOnce({
      data: {
        ...sprint({ status: 'archived', version: 7 }),
        board: { id: 42 },
      },
    });
    const api = { get, patch } as Pick<AxiosInstance, 'get' | 'patch'>;

    const result = await updateTrackerSprintStatus(1868, 'archived', 6, api as AxiosInstance);

    expect(result).toEqual({
      ...sprint({ status: 'archived', version: 7 }),
      boardId: 42,
    });
    expect(patch).toHaveBeenCalledTimes(1);
  });
});
