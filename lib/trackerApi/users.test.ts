import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiCache } from '@/lib/cache';

import { filterTrackerUsers, isDirectTrackerUserQuery, searchYandexTrackerUsers } from './users';

const users = [
  { displayName: 'Ada Lovelace', email: 'ada@example.com', login: 'ada', trackerId: '100' },
  { displayName: 'Alan Turing', email: 'alan@example.com', login: 'turing', trackerId: '200' },
];

describe('filterTrackerUsers', () => {
  it('returns empty for short queries', () => {
    expect(filterTrackerUsers(users, 'a')).toEqual([]);
  });

  it('prefers exact then substring email match when the query contains @', () => {
    expect(filterTrackerUsers(users, 'ada@example.com')).toEqual([users[0]]);
    expect(filterTrackerUsers(users, '@example.com')).toEqual(users);
  });

  it('matches display name without @', () => {
    expect(filterTrackerUsers(users, 'turing')).toEqual([users[1]]);
  });

  it('matches login and tracker id', () => {
    expect(filterTrackerUsers(users, 'ada')).toEqual([users[0]]);
    expect(filterTrackerUsers(users, '200')).toEqual([users[1]]);
  });
});

describe('isDirectTrackerUserQuery', () => {
  it('accepts login-like tokens and rejects names with spaces', () => {
    expect(isDirectTrackerUserQuery('ada')).toBe(true);
    expect(isDirectTrackerUserQuery('ada@example.com')).toBe(true);
    expect(isDirectTrackerUserQuery('Ada Lovelace')).toBe(false);
    expect(isDirectTrackerUserQuery('@example.com')).toBe(false);
    expect(isDirectTrackerUserQuery('a')).toBe(false);
  });
});

describe('searchYandexTrackerUsers', () => {
  beforeEach(() => {
    apiCache.clear();
  });

  it('returns a direct GET hit by login without listing everyone', async () => {
    const get = vi.fn((url: string) => {
      if (String(url).includes('/users/ada')) {
        return Promise.resolve({
          data: {
            display: 'Ada Lovelace',
            email: 'ada@example.com',
            login: 'ada',
            uid: 1,
          },
        });
      }
      throw new Error(`unexpected ${url}`);
    });
    const api = { defaults: { headers: {} }, get } as never;

    await expect(searchYandexTrackerUsers(api, 'ada')).resolves.toEqual([
      {
        avatarUrl: null,
        displayName: 'Ada Lovelace',
        email: 'ada@example.com',
        login: 'ada',
        trackerId: '1',
      },
    ]);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('filters a cached directory when the query is a display name', async () => {
    const get = vi.fn(() =>
      Promise.resolve({
        data: [
          { display: 'Ada Lovelace', email: 'ada@example.com', login: 'ada', uid: 1 },
          { display: 'Alan Turing', email: 'alan@example.com', login: 'turing', uid: 2 },
        ],
      })
    );
    const api = {
      defaults: { baseURL: 'https://api.tracker.test', headers: { Authorization: 'OAuth t' } },
      get,
    } as never;

    await expect(searchYandexTrackerUsers(api, 'Alan Turing')).resolves.toMatchObject([
      { displayName: 'Alan Turing', trackerId: '2' },
    ]);
    await expect(searchYandexTrackerUsers(api, 'turing')).resolves.toMatchObject([
      { displayName: 'Alan Turing', trackerId: '2' },
    ]);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('keeps email null when the payload has no email field', async () => {
    const get = vi.fn(() =>
      Promise.resolve({
        data: { display: 'Ada Lovelace', login: 'ada@example.com', uid: 1 },
      })
    );
    const api = { defaults: { headers: {} }, get } as never;

    await expect(searchYandexTrackerUsers(api, 'ada')).resolves.toMatchObject([
      { email: null, trackerId: '1' },
    ]);
  });

  it('paginates past 20 pages so display-name search reaches later users', async () => {
    const get = vi.fn((_url: string, config?: { params?: { page?: number } }) => {
      const page = config?.params?.page ?? 1;
      if (page < 23) {
        return Promise.resolve({
          data: Array.from({ length: 100 }, (_, i) => ({
            display: `User ${page}-${i}`,
            login: `u${page}_${i}`,
            uid: page * 1000 + i,
          })),
        });
      }
      if (page === 23) {
        return Promise.resolve({
          data: [
            {
              display: 'Полина Наконечная',
              email: 'p.nakonechnaia@example.com',
              login: 'p.nakonechnaia',
              uid: 8000000000001004,
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });
    const api = {
      defaults: { baseURL: 'https://api.tracker.test', headers: { Authorization: 'OAuth t' } },
      get,
    } as never;

    await expect(searchYandexTrackerUsers(api, 'Полина Наконечная')).resolves.toMatchObject([
      { displayName: 'Полина Наконечная', login: 'p.nakonechnaia', trackerId: '8000000000001004' },
    ]);
    expect(get).toHaveBeenCalledTimes(23);
  });
});
