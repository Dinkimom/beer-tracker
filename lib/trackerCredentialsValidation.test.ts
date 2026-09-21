import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getIssueTrackerProviderKind } from '@/lib/env';
import { createJiraAxiosInstance } from '@/lib/issueTrackerProvider/jiraAxios';
import { createTrackerAxiosInstance } from '@/lib/trackerAxiosFactory';

import {
  cleanOrganizationTrackerToken,
  normalizeTrackerApiBaseUrl,
  validateIssueTrackerCredentials,
  validateJiraTrackerToken,
  validateYandexTrackerOAuth,
} from './trackerCredentialsValidation';

vi.mock('@/lib/trackerAxiosFactory', () => ({
  createTrackerAxiosInstance: vi.fn(),
}));

vi.mock('@/lib/issueTrackerProvider/jiraAxios', () => ({
  createJiraAxiosInstance: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  getIssueTrackerProviderKind: vi.fn(() => 'tracker'),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getIssueTrackerProviderKind).mockReturnValue('tracker');
  vi.mocked(createTrackerAxiosInstance).mockImplementation(
    () =>
      ({
        get: vi.fn((url: string) => {
          if (url === '/myself') return Promise.resolve({ data: {} });
          if (url === '/users') return Promise.resolve({ data: [] });
          return Promise.reject(new Error(`unexpected GET ${url}`));
        }),
      }) as never
  );
});

describe('cleanOrganizationTrackerToken', () => {
  it('strips whitespace', () => {
    expect(cleanOrganizationTrackerToken('  ab cd  \n')).toBe('abcd');
  });
});

describe('normalizeTrackerApiBaseUrl', () => {
  it('removes trailing slash on path', () => {
    expect(normalizeTrackerApiBaseUrl('https://api.tracker.yandex.net/v3/')).toBe(
      'https://api.tracker.yandex.net/v3'
    );
  });
});

describe('validateYandexTrackerOAuth', () => {
  it('returns ok when /myself and /users succeed', async () => {
    const get = vi.fn((url: string) => {
      if (url === '/myself') return Promise.resolve({ data: {} });
      if (url === '/users') return Promise.resolve({ data: [] });
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const r = await validateYandexTrackerOAuth({
      apiUrl: 'https://api.tracker.yandex.net/v3',
      oauthToken: 'tok',
      orgId: '1',
    });
    expect(r.ok).toBe(true);
    expect(get).toHaveBeenCalledWith('/myself');
    expect(get).toHaveBeenCalledWith('/users', { params: { page: 1, perPage: 1 } });
  });

  it('returns failure on 401 from /myself', async () => {
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({
      get: vi.fn(() =>
        Promise.reject(Object.assign(new Error('Unauthorized'), { response: { status: 401 } }))
      ),
    } as never);
    const r = await validateYandexTrackerOAuth({
      apiUrl: 'https://api.tracker.yandex.net/v3',
      oauthToken: 'bad',
      orgId: '1',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
    }
  });

  it('returns failure when /users returns 403 after /myself ok', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: {} })
      .mockRejectedValueOnce(
        Object.assign(new Error('Forbidden'), { response: { status: 403 } })
      );
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const r = await validateYandexTrackerOAuth({
      apiUrl: 'https://api.tracker.yandex.net/v3',
      oauthToken: 'tok',
      orgId: '1',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.message).toMatch(/администратор/i);
    }
  });
});

describe('validateJiraTrackerToken', () => {
  it('returns ok on GET /myself with Jira axios (no Yandex /users)', async () => {
    const get = vi.fn((url: string) => {
      if (url === '/myself') return Promise.resolve({ data: { name: 'ada' } });
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });
    vi.mocked(createJiraAxiosInstance).mockReturnValueOnce({ get } as never);

    const r = await validateJiraTrackerToken({
      apiToken: 'pat-1',
      apiUrl: 'https://jira.example.com/rest/api/2',
    });
    expect(r.ok).toBe(true);
    expect(get).toHaveBeenCalledWith('/myself');
    expect(get).not.toHaveBeenCalledWith('/users', expect.anything());
    expect(createTrackerAxiosInstance).not.toHaveBeenCalled();
  });

  it('returns failure on 401 from /myself', async () => {
    vi.mocked(createJiraAxiosInstance).mockReturnValueOnce({
      get: vi.fn(() =>
        Promise.reject(Object.assign(new Error('Unauthorized'), { response: { status: 401 } }))
      ),
    } as never);
    const r = await validateJiraTrackerToken({
      apiToken: 'bad',
      apiUrl: 'https://jira.example.com/rest/api/2',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
    }
  });
});

describe('validateIssueTrackerCredentials', () => {
  it('dispatches to Jira when ISSUE_TRACKER_PROVIDER is jira', async () => {
    vi.mocked(getIssueTrackerProviderKind).mockReturnValue('jira-onprem');
    const get = vi.fn((url: string) => {
      if (url === '/myself') return Promise.resolve({ data: {} });
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });
    vi.mocked(createJiraAxiosInstance).mockReturnValueOnce({ get } as never);

    const r = await validateIssueTrackerCredentials({
      apiUrl: 'https://jira.example.com/rest/api/2',
      oauthToken: 'pat-1',
      orgId: 'jira',
    });
    expect(r.ok).toBe(true);
    expect(createJiraAxiosInstance).toHaveBeenCalled();
    expect(createTrackerAxiosInstance).not.toHaveBeenCalled();
  });

  it('passes Atlassian email to Jira Cloud Basic axios', async () => {
    vi.mocked(getIssueTrackerProviderKind).mockReturnValue('jira-cloud');
    const get = vi.fn((url: string) => {
      if (url === '/myself') return Promise.resolve({ data: {} });
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });
    vi.mocked(createJiraAxiosInstance).mockReturnValueOnce({ get } as never);

    const r = await validateIssueTrackerCredentials({
      apiUrl: 'https://example.atlassian.net/rest/api/3',
      email: 'ada@example.com',
      oauthToken: 'api-token',
      orgId: 'jira',
    });
    expect(r.ok).toBe(true);
    expect(createJiraAxiosInstance).toHaveBeenCalledWith({
      apiToken: 'api-token',
      apiUrl: 'https://example.atlassian.net/rest/api/3',
      email: 'ada@example.com',
    });
  });
});
