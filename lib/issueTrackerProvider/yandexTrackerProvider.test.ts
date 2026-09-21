import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTrackerAxiosInstance } from '@/lib/trackerAxiosFactory';
import { resolveTrackerApiConfigFromRequest } from '@/lib/trackerRequestConfig';

import {
  createYandexTrackerClient,
  createYandexTrackerClientFromRequest,
} from './yandexTrackerProvider';

vi.mock('@/lib/trackerAxiosFactory', () => ({
  createTrackerAxiosInstance: vi.fn((config: unknown) => ({ config })),
  requireTrackerAxiosForApiRoute: vi.fn((client: unknown) => client),
}));

vi.mock('@/lib/trackerRequestConfig', () => ({
  resolveTrackerApiConfigFromRequest: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('yandexTrackerProvider', () => {
  it('creates a Yandex Tracker axios client from explicit config', () => {
    createYandexTrackerClient({
      apiUrl: 'https://api.tracker.test/v3',
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    expect(createTrackerAxiosInstance).toHaveBeenCalledWith({
      apiUrl: 'https://api.tracker.test/v3',
      oauthToken: 'token-1',
      orgId: 'org-1',
    });
  });

  it('creates a Yandex Tracker axios client from a request context', async () => {
    vi.mocked(resolveTrackerApiConfigFromRequest).mockResolvedValueOnce({
      apiUrl: 'https://api.tracker.test/v3',
      jiraEmail: '',
      oauthToken: 'token-from-request',
      orgId: 'org-from-request',
      providerKind: 'tracker',
    });

    const request = new Request('https://beer-tracker.test/api/tracker');
    await createYandexTrackerClientFromRequest(request);

    expect(resolveTrackerApiConfigFromRequest).toHaveBeenCalledWith(request);
    expect(createTrackerAxiosInstance).toHaveBeenCalledWith({
      apiUrl: 'https://api.tracker.test/v3',
      oauthToken: 'token-from-request',
      orgId: 'org-from-request',
    });
  });
});
