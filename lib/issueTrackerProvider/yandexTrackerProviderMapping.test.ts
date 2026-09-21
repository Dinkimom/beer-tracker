import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTrackerAxiosInstance } from '@/lib/trackerAxiosFactory';

import { createYandexProviderClient } from './yandexTrackerProvider';

vi.mock('@/lib/trackerAxiosFactory', () => ({
  createTrackerAxiosInstance: vi.fn((config: unknown) => ({ config })),
  requireTrackerAxiosForApiRoute: vi.fn((client: unknown) => client),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('yandexTrackerProvider mapping', () => {
  it('maps a Yandex issue to a planner task', () => {
    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    expect(
      client.mapIssueToTask({
        id: 'BT-W2-4',
        key: 'BT-W2-4',
        provider: 'yandex-tracker',
        self: 'https://tracker.test/BT-W2-4',
        summary: 'Mapped issue',
      })
    ).toMatchObject({
      id: 'BT-W2-4',
      name: 'Mapped issue',
      link: 'https://tracker.yandex.ru/BT-W2-4',
    });
  });

  it('uses raw Yandex issue payload when applying integration mapping', async () => {
    const post = vi.fn().mockResolvedValueOnce({
      data: [
        {
          id: 'BT-W2-4C',
          key: 'BT-W2-4C',
          self: 'https://tracker.test/BT-W2-4C',
          summary: 'Mapped custom issue',
          CustomStoryPoints: 8,
        },
      ],
    });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ post } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });
    const [issue] = await client.searchIssuesOnBoard(7, 'BT-W2-4C');

    expect(client.mapIssueToTask(issue, {
      configRevision: 1,
      testingFlow: {
        devEstimateFieldId: 'CustomStoryPoints',
        mode: 'embedded_in_dev',
      },
    })).toMatchObject({
      id: 'BT-W2-4C',
      storyPoints: 8,
    });
  });

  it('fetches tasks in sprint with parents', async () => {
    const post = vi.fn().mockResolvedValueOnce({
      data: [
        { key: 'BT-W2-5', summary: 'Task', type: { key: 'task' } },
        { key: 'BT-W2-6', summary: 'Story', type: { key: 'story' } },
      ],
      headers: {},
    });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ post } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(
      client.getTasksInSprintWithParents(987654, { sprintStatus: 'in_progress' })
    ).resolves.toMatchObject([
      { key: 'BT-W2-5', provider: 'yandex-tracker', summary: 'Task', type: { key: 'task' } },
    ]);
    expect(post).toHaveBeenCalledWith('/issues/_search?expand=links&perPage=300&page=1', {
      filter: {
        sprint: [{ id: '987654' }],
      },
    });
  });

  it('lists all sprint issues without task/bug filtering', async () => {
    const post = vi.fn().mockResolvedValueOnce({
      data: [
        { key: 'BT-W5-1', summary: 'Task', type: { key: 'task' } },
        { key: 'BT-W5-2', summary: 'Story', type: { key: 'story' } },
      ],
      headers: {},
    });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ post } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(
      client.listSprintIssues(987700, { sprintStatus: 'in_progress', forceRefresh: true })
    ).resolves.toEqual([
      expect.objectContaining({ key: 'BT-W5-1', provider: 'yandex-tracker' }),
      expect.objectContaining({ key: 'BT-W5-2', provider: 'yandex-tracker' }),
    ]);
  });

  it('fetches issue changelog with comments', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            fields: [
              {
                field: { display: 'Status', id: 'status' },
                from: { display: 'Open', id: '1', key: 'open' },
                to: { display: 'In progress', id: '2', key: 'inProgress' },
              },
            ],
            id: 'log-1',
            updatedAt: '2026-01-01T10:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            createdAt: '2026-01-01T11:00:00.000Z',
            createdBy: { display: 'User', id: 'u1' },
            id: 42,
            text: 'Hello',
            updatedAt: '2026-01-01T11:00:00.000Z',
          },
        ],
      });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.getIssueChangelogWithComments('BT-W5-3')).resolves.toEqual({
      changelog: [
        expect.objectContaining({
          id: 'log-1',
          updatedAt: '2026-01-01T10:00:00.000Z',
        }),
      ],
      comments: [
        expect.objectContaining({
          id: 42,
          text: 'Hello',
        }),
      ],
    });
    expect(get).toHaveBeenCalledWith('/issues/BT-W5-3/changelog?perPage=100');
    expect(get).toHaveBeenCalledWith('/issues/BT-W5-3/comments?expand=all&perPage=100');
  });

  it('fetches issue changelog batch keyed by issue', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(
      client.getIssuesChangelogBatch(['BT-W5-4', 'BT-W5-5'])
    ).resolves.toEqual({
      'BT-W5-4': { changelog: [], comments: [] },
      'BT-W5-5': { changelog: [], comments: [] },
    });
  });

  it('builds burndown issues from sprint keys and changelog pages', async () => {
    const get = vi.fn().mockResolvedValueOnce({
      data: [
        {
          fields: [
            {
              field: { display: 'Status', id: 'status' },
              from: { display: 'Open', id: '1', key: 'open' },
              to: { display: 'Done', id: '2', key: 'done' },
            },
          ],
          id: 'log-b1',
          updatedAt: '2026-01-01T10:00:00.000Z',
        },
      ],
    });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });
    const issueByKey = new Map([
      [
        'BT-W5-6',
        {
          id: 'BT-W5-6',
          key: 'BT-W5-6',
          provider: 'yandex-tracker' as const,
          storyPoints: 3,
          summary: 'Burndown task',
        },
      ],
    ]);

    const burndownIssues = await client.getBurndownIssuesForKeys(
      ['BT-W5-6'],
      { sprintId: '123', sprintName: 'Sprint 1' },
      issueByKey
    );

    expect(burndownIssues).toHaveLength(1);
    expect(burndownIssues[0]).toMatchObject({
      issueKey: 'BT-W5-6',
      storyPoints: 3,
    });
    expect(get).toHaveBeenCalledWith('/issues/BT-W5-6/changelog?perPage=100');
  });

  it('lists issues updated in a date range', async () => {
    const post = vi.fn().mockResolvedValueOnce({
      data: [{ key: 'BT-W6-1', summary: 'Updated issue', updatedAt: '2026-06-01T12:00:00.000Z' }],
      headers: { 'x-total-pages': '1' },
    });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ post } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    const since = new Date('2026-06-01T00:00:00.000Z');
    const until = new Date('2026-06-01T23:59:59.000Z');
    await expect(
      client.listIssuesUpdatedInRange(since, until, { maxIssues: 100, perPage: 50 })
    ).resolves.toEqual({
      issues: [expect.objectContaining({ key: 'BT-W6-1', provider: 'yandex-tracker' })],
      truncated: false,
    });
    expect(post).toHaveBeenCalledWith('/issues/_search?expand=links&perPage=50&page=1', {
      filter: {
        updatedAt: {
          from: '2026-06-01T00:00:00.000+0000',
          to: '2026-06-01T23:59:59.000+0000',
        },
      },
      order: '+updatedAt',
    });
  });

  it('lists all issues on a board with pagination checkpoints', async () => {
    const post = vi.fn().mockResolvedValueOnce({
      data: [{ key: 'BT-W6-2', summary: 'Board issue' }],
      headers: { 'x-total-pages': '1' },
    });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ post } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    const checkpoints: number[] = [];
    await expect(
      client.listIssuesForBoard(42, {
        maxTotalIssues: 500,
        onCheckpoint: (c) => {
          checkpoints.push(c.page);
        },
        perPage: 100,
      })
    ).resolves.toEqual({
      issues: [expect.objectContaining({ key: 'BT-W6-2', provider: 'yandex-tracker' })],
      truncated: false,
    });
    expect(checkpoints).toEqual([1]);
    expect(post).toHaveBeenCalledWith('/issues/_search?expand=links&perPage=100&page=1', {
      query: 'boards: 42',
    });
  });

  it('lists all issues in a queue with pagination checkpoints', async () => {
    const post = vi.fn().mockResolvedValueOnce({
      data: [{ key: 'ST-1', summary: 'Queue issue' }],
      headers: { 'x-total-pages': '1' },
    });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ post } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    const checkpoints: string[] = [];
    await expect(
      client.listIssuesForQueue('ST', {
        maxTotalIssues: 500,
        onCheckpoint: (c) => {
          checkpoints.push(c.queueKey);
        },
        perPage: 100,
      })
    ).resolves.toEqual({
      issues: [expect.objectContaining({ key: 'ST-1', provider: 'yandex-tracker' })],
      truncated: false,
    });
    expect(checkpoints).toEqual(['ST']);
    expect(post).toHaveBeenCalledWith('/issues/_search?expand=links&perPage=100&page=1', {
      filter: { queue: 'ST' },
    });
  });

  it('lists issues by arbitrary query language', async () => {
    const post = vi.fn().mockResolvedValueOnce({
      data: [{ key: 'BT-W6-3', summary: 'Team bug' }],
      headers: { 'x-total-pages': '1' },
    });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ post } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(
      client.listIssuesByQuery(
        '"Продуктовая команда": "team-booking" AND Type: bug AND Status: !closed',
        {
        maxTotalIssues: 500,
        perPage: 100,
      })
    ).resolves.toEqual({
      issues: [expect.objectContaining({ key: 'BT-W6-3', provider: 'yandex-tracker' })],
      truncated: false,
    });
    expect(post).toHaveBeenCalledWith('/issues/_search?expand=links&perPage=100&page=1', {
      query: '"Продуктовая команда": "team-booking" AND Type: bug AND Status: !closed',
    });
  });
});
