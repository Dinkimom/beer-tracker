import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchJiraUserAvatarUrl, jiraUserGetRequestParams } from './jiraUserAvatar';

describe('jiraUserGetRequestParams', () => {
  it('uses accountId on Cloud', () => {
    expect(jiraUserGetRequestParams('acc-1', 'jira-cloud')).toEqual({ accountId: 'acc-1' });
  });

  it('uses username on Data Center', () => {
    expect(jiraUserGetRequestParams('ada', 'jira-onprem')).toEqual({ username: 'ada' });
  });
});

describe('fetchJiraUserAvatarUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for empty tracker id', async () => {
    const get = vi.fn();
    await expect(fetchJiraUserAvatarUrl({ get } as never, '  ', 'jira-cloud')).resolves.toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it('reads Cloud avatar from GET /user?accountId=', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        accountId: 'acc-1',
        avatarUrls: { '48x48': 'https://jira.example/a.png' },
        displayName: 'Ada',
      },
    });
    await expect(fetchJiraUserAvatarUrl({ get } as never, 'acc-1', 'jira-cloud')).resolves.toBe(
      'https://jira.example/a.png'
    );
    expect(get).toHaveBeenCalledWith('/user', { params: { accountId: 'acc-1' } });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('falls back to key on Data Center when username misses', async () => {
    const get = vi
      .fn()
      .mockRejectedValueOnce(new Error('404'))
      .mockResolvedValueOnce({
        data: {
          avatarUrls: { '48x48': 'https://jira.example/b.png' },
          key: 'JIRAUSER1',
          name: 'ada',
        },
      });
    await expect(fetchJiraUserAvatarUrl({ get } as never, 'ada', 'jira-onprem')).resolves.toBe(
      'https://jira.example/b.png'
    );
    expect(get).toHaveBeenNthCalledWith(1, '/user', { params: { username: 'ada' } });
    expect(get).toHaveBeenNthCalledWith(2, '/user', { params: { key: 'ada' } });
  });
});
