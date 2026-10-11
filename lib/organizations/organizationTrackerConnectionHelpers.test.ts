import { describe, expect, it } from 'vitest';

import {
  resolveIssueTrackerForConnection,
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

describe('resolveIssueTrackerForConnection', () => {
  const fresh = { initial_sync_completed_at: null, settings: {} };
  const syncedYandex = {
    initial_sync_completed_at: new Date('2026-01-01T00:00:00.000Z'),
    settings: { issueTracker: { provider: 'tracker' } },
  };

  it('asks to pick a tracker when neither the form nor the organization has one', () => {
    expect(resolveIssueTrackerForConnection(fresh, {})).toMatchObject({ ok: false, status: 400 });
  });

  it('uses the public Yandex API when the URL is empty', () => {
    expect(resolveIssueTrackerForConnection(fresh, { provider: 'tracker', trackerApiBaseUrl: '' })).toEqual({
      config: { apiUrl: 'https://api.tracker.yandex.net/v3', kind: 'tracker' },
      ok: true,
    });
  });

  it('requires a URL for Jira', () => {
    expect(
      resolveIssueTrackerForConnection(fresh, { provider: 'jira-onprem', trackerApiBaseUrl: '  ' })
    ).toMatchObject({ ok: false, status: 400 });
  });

  it('rejects a malformed URL', () => {
    expect(
      resolveIssueTrackerForConnection(fresh, { provider: 'jira-onprem', trackerApiBaseUrl: 'not a url' })
    ).toMatchObject({ ok: false, status: 400 });
  });

  it('normalizes the form URL', () => {
    expect(
      resolveIssueTrackerForConnection(fresh, {
        provider: 'jira-cloud',
        trackerApiBaseUrl: ' https://acme.atlassian.net/rest/api/3/ ',
      })
    ).toEqual({
      config: { apiUrl: 'https://acme.atlassian.net/rest/api/3', kind: 'jira-cloud' },
      ok: true,
    });
  });

  it('keeps the stored URL when the form leaves it empty', () => {
    const org = {
      initial_sync_completed_at: null,
      settings: { issueTracker: { apiUrl: 'https://jira.example.com/rest/api/2', provider: 'jira-onprem' } },
    };
    expect(resolveIssueTrackerForConnection(org, {})).toEqual({
      config: { apiUrl: 'https://jira.example.com/rest/api/2', kind: 'jira-onprem' },
      ok: true,
    });
  });

  it('does not reuse the stored URL of another tracker type', () => {
    const org = {
      initial_sync_completed_at: null,
      settings: { issueTracker: { apiUrl: 'https://jira.example.com/rest/api/2', provider: 'jira-onprem' } },
    };
    expect(resolveIssueTrackerForConnection(org, { provider: 'jira-cloud' })).toMatchObject({
      ok: false,
      status: 400,
    });
  });

  it('refuses to switch the tracker after the first sync', () => {
    expect(
      resolveIssueTrackerForConnection(syncedYandex, {
        provider: 'jira-onprem',
        trackerApiBaseUrl: 'https://jira.example.com/rest/api/2',
      })
    ).toMatchObject({ ok: false, status: 409 });
  });

  it('allows reconnecting the same tracker after the first sync', () => {
    expect(resolveIssueTrackerForConnection(syncedYandex, { provider: 'tracker' })).toMatchObject({
      ok: true,
    });
  });
});
