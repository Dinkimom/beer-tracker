import { describe, expect, it, vi } from 'vitest';

import {
  jiraUserSearchRequestParams,
  mapJiraUserSearchHit,
  searchJiraUsers,
} from './jiraUserSearch';

describe('mapJiraUserSearchHit', () => {
  it('maps Cloud accountId and email', () => {
    expect(
      mapJiraUserSearchHit({
        accountId: 'abc-123',
        active: true,
        avatarUrls: { '48x48': 'https://example.com/a.png' },
        displayName: 'Ada Lovelace',
        emailAddress: 'ada@example.com',
      })
    ).toEqual({
      avatarUrl: 'https://example.com/a.png',
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      trackerId: 'abc-123',
    });
  });

  it('falls back to Server name/key and skips inactive users', () => {
    expect(mapJiraUserSearchHit({ active: false, name: 'ada' })).toBeNull();
    expect(mapJiraUserSearchHit({ displayName: 'Ada', name: 'ada' })?.trackerId).toBe('ada');
    expect(mapJiraUserSearchHit({ displayName: 'Ada', key: 'JIRAUSER1' })?.trackerId).toBe(
      'JIRAUSER1'
    );
    expect(mapJiraUserSearchHit({ accountId: 'u1', email: 'ada@example.com' })?.email).toBe(
      'ada@example.com'
    );
  });
});

describe('jiraUserSearchRequestParams', () => {
  it('sends query only on Jira Cloud (username is rejected with 400)', () => {
    expect(jiraUserSearchRequestParams('d@example.com', 'jira-cloud')).toEqual({
      maxResults: 50,
      query: 'd@example.com',
    });
  });

  it('sends username on Jira Data Center / Server', () => {
    expect(jiraUserSearchRequestParams('ada', 'jira-onprem', 5)).toEqual({
      maxResults: 5,
      username: 'ada',
    });
  });
});

describe('searchJiraUsers', () => {
  it('returns empty for short queries without calling the API', async () => {
    const get = vi.fn();
    await expect(searchJiraUsers({ get } as never, 'a', 'jira-cloud')).resolves.toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });

  it('queries Cloud /user/search without username and maps hits', async () => {
    const get = vi.fn().mockResolvedValue({
      data: [{ accountId: 'u1', displayName: 'Ada', emailAddress: 'ada@example.com' }],
    });
    const users = await searchJiraUsers({ get } as never, 'ada@example.com', 'jira-cloud');
    expect(get).toHaveBeenCalledWith('/user/search', {
      params: { maxResults: 50, query: 'ada@example.com' },
    });
    expect(get).toHaveBeenCalledTimes(1);
    expect(users).toEqual([
      {
        avatarUrl: null,
        displayName: 'Ada',
        email: 'ada@example.com',
        trackerId: 'u1',
      },
    ]);
  });

  it('keeps email null when Jira omits emailAddress', async () => {
    const get = vi.fn().mockResolvedValue({
      data: [{ accountId: 'u1', displayName: 'Ada' }],
    });
    await expect(searchJiraUsers({ get } as never, 'Ada', 'jira-cloud')).resolves.toEqual([
      {
        avatarUrl: null,
        displayName: 'Ada',
        email: null,
        trackerId: 'u1',
      },
    ]);
    expect(get).toHaveBeenCalledTimes(1);
  });
});
