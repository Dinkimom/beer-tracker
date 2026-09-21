import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getIssueTrackerProviderKind } from '@/lib/env';
import { createJiraAxiosInstance } from '@/lib/issueTrackerProvider/jiraAxios';
import { createTrackerAxiosInstance } from '@/lib/trackerAxiosFactory';

import { createIssueTrackerAxiosForCredentials } from './createIssueTrackerAxios';

vi.mock('@/lib/env', () => ({
  getIssueTrackerProviderKind: vi.fn(() => 'tracker'),
}));

vi.mock('@/lib/issueTrackerProvider/jiraAxios', () => ({
  createJiraAxiosInstance: vi.fn(() => ({ kind: 'jira' })),
}));

vi.mock('@/lib/trackerAxiosFactory', () => ({
  createTrackerAxiosInstance: vi.fn(() => ({ kind: 'yandex' })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getIssueTrackerProviderKind).mockReturnValue('tracker');
});

describe('createIssueTrackerAxiosForCredentials', () => {
  const config = {
    apiUrl: 'https://jira.example.com/rest/api/2',
    oauthToken: 'pat-1',
    orgId: 'jira',
  };

  it('uses Yandex OAuth axios by default', () => {
    expect(createIssueTrackerAxiosForCredentials(config)).toEqual({ kind: 'yandex' });
    expect(createTrackerAxiosInstance).toHaveBeenCalledWith({
      apiUrl: config.apiUrl,
      oauthToken: 'pat-1',
      orgId: 'jira',
    });
    expect(createJiraAxiosInstance).not.toHaveBeenCalled();
  });

  it('uses Jira Bearer/Basic axios when ISSUE_TRACKER_PROVIDER is jira', () => {
    vi.mocked(getIssueTrackerProviderKind).mockReturnValue('jira-onprem');
    expect(createIssueTrackerAxiosForCredentials(config)).toEqual({ kind: 'jira' });
    expect(createJiraAxiosInstance).toHaveBeenCalledWith({
      apiToken: 'pat-1',
      apiUrl: config.apiUrl,
      email: undefined,
    });
    expect(createTrackerAxiosInstance).not.toHaveBeenCalled();
  });

  it('passes Atlassian email for Jira Cloud Basic auth', () => {
    vi.mocked(getIssueTrackerProviderKind).mockReturnValue('jira-cloud');
    expect(
      createIssueTrackerAxiosForCredentials({
        ...config,
        jiraEmail: 'ada@example.com',
      })
    ).toEqual({ kind: 'jira' });
    expect(createJiraAxiosInstance).toHaveBeenCalledWith({
      apiToken: 'pat-1',
      apiUrl: config.apiUrl,
      email: 'ada@example.com',
    });
  });
});
