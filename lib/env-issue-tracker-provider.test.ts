import { afterEach, describe, expect, it } from 'vitest';

import { getIssueTrackerProviderKind } from './env';

describe('getIssueTrackerProviderKind', () => {
  const previousProvider = process.env.ISSUE_TRACKER_PROVIDER;
  const previousApiUrl = process.env.TRACKER_API_URL;

  afterEach(() => {
    if (previousProvider === undefined) {
      delete process.env.ISSUE_TRACKER_PROVIDER;
    } else {
      process.env.ISSUE_TRACKER_PROVIDER = previousProvider;
    }
    if (previousApiUrl === undefined) {
      delete process.env.TRACKER_API_URL;
    } else {
      process.env.TRACKER_API_URL = previousApiUrl;
    }
  });

  it('defaults to tracker', () => {
    delete process.env.ISSUE_TRACKER_PROVIDER;
    expect(getIssueTrackerProviderKind()).toBe('tracker');
  });

  it('accepts jira-cloud and jira-onprem', () => {
    process.env.ISSUE_TRACKER_PROVIDER = 'jira-cloud';
    expect(getIssueTrackerProviderKind()).toBe('jira-cloud');
    process.env.ISSUE_TRACKER_PROVIDER = 'jira-onprem';
    expect(getIssueTrackerProviderKind()).toBe('jira-onprem');
  });

  it('maps yandex-tracker alias to tracker', () => {
    process.env.ISSUE_TRACKER_PROVIDER = 'yandex-tracker';
    expect(getIssueTrackerProviderKind()).toBe('tracker');
  });

  it('maps legacy jira to jira-cloud when TRACKER_API_URL is Atlassian Cloud', () => {
    process.env.ISSUE_TRACKER_PROVIDER = 'jira';
    process.env.TRACKER_API_URL = 'https://example.atlassian.net/rest/api/3';
    expect(getIssueTrackerProviderKind()).toBe('jira-cloud');
  });

  it('maps legacy jira to jira-onprem when TRACKER_API_URL is Data Center', () => {
    process.env.ISSUE_TRACKER_PROVIDER = 'jira';
    process.env.TRACKER_API_URL = 'https://jira.example.com/rest/api/2';
    expect(getIssueTrackerProviderKind()).toBe('jira-onprem');
  });

  it('rejects unknown values', () => {
    process.env.ISSUE_TRACKER_PROVIDER = 'linear';
    expect(() => getIssueTrackerProviderKind()).toThrow(/ISSUE_TRACKER_PROVIDER must be one of/);
  });
});
