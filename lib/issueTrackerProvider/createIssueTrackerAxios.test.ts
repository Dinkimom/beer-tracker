import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createJiraAxiosInstance } from '@/lib/issueTrackerProvider/jiraAxios';
import { createTrackerAxiosInstance } from '@/lib/trackerAxiosFactory';

import { createIssueTrackerAxiosForCredentials } from './createIssueTrackerAxios';

vi.mock('@/lib/issueTrackerProvider/jiraAxios', () => ({
  createJiraAxiosInstance: vi.fn(() => ({ kind: 'jira' })),
}));

vi.mock('@/lib/trackerAxiosFactory', () => ({
  createTrackerAxiosInstance: vi.fn(() => ({ kind: 'yandex' })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createIssueTrackerAxiosForCredentials', () => {
  const config = {
    apiUrl: 'https://jira.example.com/rest/api/2',
    oauthToken: 'pat-1',
    orgId: 'jira',
  };

  it('uses Yandex OAuth axios for the tracker provider', () => {
    expect(
      createIssueTrackerAxiosForCredentials({ ...config, providerKind: 'tracker' })
    ).toEqual({ kind: 'yandex' });
    expect(createTrackerAxiosInstance).toHaveBeenCalledWith({
      apiUrl: config.apiUrl,
      oauthToken: 'pat-1',
      orgId: 'jira',
    });
    expect(createJiraAxiosInstance).not.toHaveBeenCalled();
  });

  it('uses Jira Bearer/Basic axios for jira-onprem', () => {
    expect(
      createIssueTrackerAxiosForCredentials({ ...config, providerKind: 'jira-onprem' })
    ).toEqual({ kind: 'jira' });
    expect(createJiraAxiosInstance).toHaveBeenCalledWith({
      apiToken: 'pat-1',
      apiUrl: config.apiUrl,
      email: undefined,
    });
    expect(createTrackerAxiosInstance).not.toHaveBeenCalled();
  });

  it('uses Jira axios for jira-cloud (Bearer OAuth; email unused)', () => {
    expect(
      createIssueTrackerAxiosForCredentials({ ...config, providerKind: 'jira-cloud' })
    ).toEqual({ kind: 'jira' });
    expect(createJiraAxiosInstance).toHaveBeenCalledWith({
      apiToken: 'pat-1',
      apiUrl: config.apiUrl,
      email: undefined,
    });
  });
});
