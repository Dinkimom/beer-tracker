import { describe, expect, it } from 'vitest';

import {
  resolveTrackerConnectionCloudId,
  resolveTrackerConnectionEmail,
} from './organizationTrackerConnectionHelpers';

describe('resolveTrackerConnectionCloudId', () => {
  it('prefers explicit cloudId', () => {
    expect(
      resolveTrackerConnectionCloudId({
        cloudId: '  cloud-from-form  ',
        settingsRoot: {
          issueTracker: { cloudId: 'stored-cloud', provider: 'jira-cloud' },
        },
      })
    ).toBe('cloud-from-form');
  });

  it('falls back to stored org cloudId', () => {
    expect(
      resolveTrackerConnectionCloudId({
        settingsRoot: {
          issueTracker: { cloudId: 'stored-cloud', provider: 'jira-cloud' },
        },
      })
    ).toBe('stored-cloud');
  });

  it('returns empty when neither is set', () => {
    expect(resolveTrackerConnectionCloudId({ settingsRoot: {} })).toBe('');
  });
});

describe('resolveTrackerConnectionEmail', () => {
  it('prefers form email when a new token is provided', () => {
    expect(
      resolveTrackerConnectionEmail({
        jiraEmail: 'ada@example.com',
        oauthToken: 'api-token',
        settingsRoot: {
          issueTracker: { basicAuthEmail: 'org@example.com', provider: 'jira-cloud' },
        },
      })
    ).toBe('ada@example.com');
  });

  it('falls back to stored org email when form email is empty with a new token', () => {
    expect(
      resolveTrackerConnectionEmail({
        jiraEmail: '',
        oauthToken: 'api-token',
        settingsRoot: {
          issueTracker: { basicAuthEmail: 'org@example.com', provider: 'jira-cloud' },
        },
      })
    ).toBe('org@example.com');
  });

  it('uses stored org email when reusing the saved token', () => {
    expect(
      resolveTrackerConnectionEmail({
        jiraEmail: 'ada@example.com',
        settingsRoot: {
          issueTracker: { basicAuthEmail: 'org@example.com', provider: 'jira-cloud' },
        },
      })
    ).toBe('org@example.com');
  });
});
