import { describe, expect, it, vi } from 'vitest';

import { fetchJiraCurrentUser, mapJiraMyself } from './jiraMyself';

describe('mapJiraMyself', () => {
  it('maps Server/DC name and display', () => {
    expect(
      mapJiraMyself({
        avatarUrls: { '48x48': 'https://jira.example/a.png' },
        displayName: 'Ada Lovelace',
        emailAddress: 'ada@example.com',
        key: 'JIRAUSER1',
        name: 'ada',
      })
    ).toEqual({
      avatarUrl: 'https://jira.example/a.png',
      display: 'Ada Lovelace',
      email: 'ada@example.com',
      emailAddress: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      login: 'ada',
      trackerUid: 'ada',
      uid: 'ada',
    });
  });

  it('falls back to Cloud accountId', () => {
    expect(mapJiraMyself({ accountId: 'acc-1', displayName: 'Ada' })?.uid).toBe('acc-1');
  });

  it('returns null without an identity', () => {
    expect(mapJiraMyself(null)).toBeNull();
    expect(mapJiraMyself({})).toBeNull();
  });
});

describe('fetchJiraCurrentUser', () => {
  it('GETs /myself and maps the payload', async () => {
    const get = vi.fn().mockResolvedValue({ data: { displayName: 'Ada', name: 'ada' } });
    await expect(fetchJiraCurrentUser({ get } as never)).resolves.toMatchObject({
      display: 'Ada',
      uid: 'ada',
    });
    expect(get).toHaveBeenCalledWith('/myself');
  });
});
