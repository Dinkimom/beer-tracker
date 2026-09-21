import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiCache } from '../cache';
import { requireTrackerAxiosForApiRoute } from '../trackerAxiosFactory';

import {
  fetchQueueIssueTypeResolutions,
  resolutionOptionsForSelect,
} from './queueResolutions';

vi.mock('../trackerAxiosFactory', () => ({
  requireTrackerAxiosForApiRoute: vi.fn(),
}));

describe('queueResolutions', () => {
  beforeEach(() => {
    apiCache.clear();
    vi.clearAllMocks();
  });

  it('returns resolutions for matching issue type from issueTypesConfig', async () => {
    const get = vi.fn().mockResolvedValueOnce({
      data: {
        issueTypesConfig: [
          {
            issueType: { key: 'bug' },
            resolutions: [
              { key: 'fixed', display: 'Решен' },
              { key: 'wontFix', display: "Won't fix" },
            ],
          },
          {
            issueType: { key: 'task' },
            resolutions: [{ key: 'fixed', display: 'Готово' }],
          },
        ],
      },
    });
    vi.mocked(requireTrackerAxiosForApiRoute).mockReturnValueOnce({ get } as never);

    await expect(fetchQueueIssueTypeResolutions('BT', 'task')).resolves.toEqual([
      { key: 'fixed', display: 'Готово' },
    ]);
    expect(get).toHaveBeenCalledWith(
      'https://api.tracker.yandex.net/v3/queues/BT',
      { params: { expand: 'issueTypesConfig' } }
    );
  });

  it('falls back to union of resolutions when type is missing', async () => {
    const get = vi.fn().mockResolvedValueOnce({
      data: {
        issueTypesConfig: [
          {
            issueType: { key: 'bug' },
            resolutions: [{ key: 'fixed', display: 'Решен' }],
          },
          {
            issueType: { key: 'task' },
            resolutions: [
              { key: 'fixed', display: 'Готово' },
              { key: 'wontFix', display: 'Не будет исправлено' },
            ],
          },
        ],
      },
    });
    vi.mocked(requireTrackerAxiosForApiRoute).mockReturnValueOnce({ get } as never);

    await expect(fetchQueueIssueTypeResolutions('BT', undefined)).resolves.toEqual([
      { key: 'fixed', display: 'Решен' },
      { key: 'wontFix', display: 'Не будет исправлено' },
    ]);
  });

  it('maps resolutions to select options', () => {
    expect(
      resolutionOptionsForSelect([
        { key: 'fixed', display: 'Решен' },
        { key: 'wontFix', display: 'Не будет исправлено' },
      ])
    ).toEqual([
      { label: 'Решен', value: 'fixed' },
      { label: 'Не будет исправлено', value: 'wontFix' },
    ]);
  });
});
