import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiCache } from '@/lib/cache';
import { createTrackerAxiosInstance } from '@/lib/trackerAxiosFactory';

import { createYandexProviderClient } from './yandexTrackerProvider';

vi.mock('@/lib/trackerAxiosFactory', () => ({
  createTrackerAxiosInstance: vi.fn((config: unknown) => ({ config })),
  requireTrackerAxiosForApiRoute: vi.fn((client: unknown) => client),
}));

beforeEach(() => {
  apiCache.clear();
  vi.clearAllMocks();
});

describe('yandexTrackerProvider domain client', () => {
  it('fetches the current user', async () => {
    const get = vi.fn().mockResolvedValueOnce({ data: { uid: 123, display: 'User' } });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.getCurrentUser()).resolves.toEqual({ uid: 123, display: 'User' });
    expect(get).toHaveBeenCalledWith('/myself');
  });

  it('lists boards through Tracker v3 pagination endpoint', async () => {
    const get = vi.fn().mockResolvedValueOnce({
      data: [{ id: 1, name: 'Board', self: 'https://tracker.test/board/1' }],
    });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.listBoards()).resolves.toEqual([
      { id: 1, name: 'Board', self: 'https://tracker.test/board/1' },
    ]);
    expect(get).toHaveBeenCalledWith(
      'https://api.tracker.yandex.net/v3/boards/_paginate?perPage=500'
    );
  });

  it('lists sprints for a board', async () => {
    const get = vi.fn().mockResolvedValueOnce({ data: [{ id: 10, name: 'Sprint' }] });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.listSprints(7)).resolves.toEqual([{ id: 10, name: 'Sprint' }]);
    expect(get).toHaveBeenCalledWith('/boards/7/sprints');
  });

  it('creates an issue with Yandex Tracker payload', async () => {
    const post = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'issue-id-1',
        key: 'BT-W4-5',
        self: 'https://tracker.test/BT-W4-5',
      },
    });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ post } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(
      client.createIssue({
        assignee: 'user-1',
        priority: 'normal',
        queue: 'BT',
        sprint: 123,
        summary: 'Created issue',
        type: 'task',
      })
    ).resolves.toEqual({
      id: 'issue-id-1',
      key: 'BT-W4-5',
      self: 'https://tracker.test/BT-W4-5',
    });
    expect(post).toHaveBeenCalledWith('/issues', {
      assignee: 'user-1',
      priority: 'normal',
      queue: 'BT',
      sprint: 123,
      summary: 'Created issue',
      type: 'task',
    });
  });

  it('creates a related issue by copying source issue fields', async () => {
    const get = vi.fn().mockResolvedValueOnce({
      data: {
        assignee: { id: 'user-1' },
        bizErpTeam: ['erp'],
        description: 'Source description',
        functionalTeam: 'platform',
        key: 'BT-W4-SOURCE',
        parent: { key: 'BT-W4-PARENT' },
        priority: { key: 'normal' },
        queue: { key: 'BT' },
        stage: 'dev',
        type: { key: 'task' },
      },
    });
    const post = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          id: 'issue-id-2',
          key: 'BT-W4-RELATED',
          sprint: [],
          summary: 'Related issue',
        },
      })
      .mockResolvedValueOnce({ data: {} });
    const patch = vi.fn().mockResolvedValueOnce({ data: {} });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get, patch, post } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(
      client.createRelatedIssue('BT-W4-SOURCE', {
        sprintId: 123,
        storyPoints: 3,
        testPoints: 1,
        title: 'Related issue',
      })
    ).resolves.toMatchObject({
      id: 'issue-id-2',
      key: 'BT-W4-RELATED',
      summary: 'Related issue',
    });
    expect(post).toHaveBeenCalledWith('/issues', {
      assignee: 'user-1',
      bizErpTeam: ['erp'],
      description: 'Source description',
      functionalTeam: 'platform',
      parent: 'BT-W4-PARENT',
      priority: 'normal',
      queue: 'BT',
      stage: 'dev',
      storyPoints: 3,
      summary: 'Related issue',
      testPoints: 1,
      type: 'task',
    });
    expect(patch).toHaveBeenCalledWith('/issues/BT-W4-RELATED', {
      sprint: [{ id: '123' }],
    });
    expect(post).toHaveBeenCalledWith('/issues/BT-W4-SOURCE/links', {
      issue: 'BT-W4-RELATED',
      relationship: 'relates',
    });
  });

  it('creates a sprint with Yandex Tracker board payload', async () => {
    const post = vi.fn().mockResolvedValueOnce({ data: { id: 10, name: 'Sprint' } });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ post } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(
      client.createSprint({
        boardId: 7,
        endDate: '2026-06-26',
        name: 'Sprint',
        startDate: '2026-06-15',
      })
    ).resolves.toEqual({ id: 10, name: 'Sprint' });
    expect(post).toHaveBeenCalledWith('/sprints', {
      board: { id: '7' },
      endDate: '2026-06-26',
      name: 'Sprint',
      startDate: '2026-06-15',
    });
  });

  it('fetches board params through Tracker v3 board endpoints', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: 7, name: 'Board' } })
      .mockResolvedValueOnce({
        data: [
          {
            id: 1,
            name: 'Open',
            self: 'https://tracker.test/column/1',
            statuses: [{ key: 'open' }],
          },
        ],
      });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.getBoard(7)).resolves.toMatchObject({
      id: 7,
      name: 'Board',
      columns: [{ display: 'Open', id: '1', statusKeys: ['open'] }],
    });
    expect(get).toHaveBeenCalledWith('https://api.tracker.yandex.net/v3/boards/7');
    expect(get).toHaveBeenCalledWith('https://api.tracker.yandex.net/v3/boards/7/columns');
  });

  it('fetches a queue by key', async () => {
    const get = vi.fn().mockResolvedValueOnce({ data: { key: 'BT', name: 'Beer Tracker' } });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.getQueue('BT')).resolves.toEqual({ key: 'BT', name: 'Beer Tracker' });
    expect(get).toHaveBeenCalledWith('https://api.tracker.yandex.net/v3/queues/BT');
  });

  it('searches queues through Yandex queue helpers', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: { key: 'QQ', name: 'Quality Queue' } })
      .mockResolvedValueOnce({
        data: [
          { key: 'QQ', name: 'Quality Queue' },
          { key: 'OPS', name: 'Operations' },
        ],
      });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.searchQueues('QQ')).resolves.toEqual([
      { key: 'QQ', name: 'Quality Queue' },
    ]);
  });

  it('lists queues through Tracker v3 pagination', async () => {
    const get = vi.fn().mockResolvedValueOnce({
      data: [{ key: 'QQ', name: 'Quality Queue' }],
    });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.listQueues()).resolves.toEqual([{ key: 'QQ', name: 'Quality Queue' }]);
    expect(get).toHaveBeenCalledWith(
      'https://api.tracker.yandex.net/v3/queues/',
      expect.objectContaining({ params: { perPage: 500 } })
    );
  });

  it('fetches queue workflows', async () => {
    const get = vi.fn().mockResolvedValueOnce({
      data: {
        workflowDev: [
          { id: 'task', key: 'task', display: 'Task' },
          { id: 'bug', key: 'bug', display: 'Bug' },
        ],
      },
    });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.getQueueWorkflows('BT-W3-Q')).resolves.toEqual({
      workflowDev: [
        { id: 'task', key: 'task', display: 'Task' },
        { id: 'bug', key: 'bug', display: 'Bug' },
      ],
    });
    expect(get).toHaveBeenCalledWith(
      'https://api.tracker.yandex.net/v3/queues/BT-W3-Q/workflows'
    );
  });

  it('fetches queue workflow screens', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          workflowDev: [{ id: 'task', key: 'task', display: 'Task' }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          steps: [
            {
              actions: [
                {
                  id: 'startProgress',
                  key: 'startProgress',
                  screen: { id: 'screen-1' },
                  target: { key: 'inProgress' },
                },
              ],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          elements: [
            { field: { id: 'resolution', display: 'Resolution' }, required: true },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          issueTypesConfig: [
            {
              issueType: { key: 'task' },
              resolutions: [{ key: 'fixed', display: 'Решен' }],
            },
          ],
        },
      });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    const resolutionField = {
      id: 'resolution',
      display: 'Resolution',
      required: true,
      schemaType: 'resolution',
      options: [{ label: 'Решен', value: 'fixed' }],
    };
    await expect(client.getQueueWorkflowScreens('BT-W3-Q-SCREENS')).resolves.toEqual({
      task: {
        inProgressMeta: [resolutionField],
        startProgress: [resolutionField],
      },
    });
    expect(get).toHaveBeenCalledWith(
      'https://api.tracker.yandex.net/v3/queues/BT-W3-Q-SCREENS/workflows'
    );
    expect(get).toHaveBeenCalledWith('https://api.tracker.yandex.net/v3/workflows/workflowDev');
    expect(get).toHaveBeenCalledWith('https://api.tracker.yandex.net/v3/screens/screen-1');
    expect(get).toHaveBeenCalledWith(
      'https://api.tracker.yandex.net/v3/queues/BT-W3-Q-SCREENS',
      { params: { expand: 'issueTypesConfig' } }
    );
  });

  it('fetches fields and screens', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: 'summary', name: 'Summary' } })
      .mockResolvedValueOnce({
        data: {
          elements: [
            { field: { id: 'summary', display: 'Summary' }, required: true },
          ],
        },
      });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.getField('summary')).resolves.toEqual({
      id: 'summary',
      name: 'Summary',
    });
    await expect(client.getScreen('screen-1')).resolves.toEqual({
      elements: [{ field: { id: 'summary', display: 'Summary' }, required: true }],
    });
  });

  it('enriches screen fields with field schemas', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          elements: [
            { field: { id: 'priority', display: 'Priority' }, required: true },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: 'priority',
          name: 'Priority',
          optionsProvider: {
            type: 'FixedListOptionsProvider',
            values: ['normal', 'urgent'],
          },
          schema: { required: false, type: 'string' },
        },
      });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.getScreenFields('screen-1')).resolves.toEqual([
      {
        display: 'Priority',
        id: 'priority',
        options: ['normal', 'urgent'],
        required: true,
        schemaType: 'string',
      },
    ]);
  });

  it('fetches an issue and checklist', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: { key: 'BT-W2-1', summary: 'Issue' } })
      .mockResolvedValueOnce({
        data: [{ checked: true, checklistItemType: 'standard', id: 'c1', text: 'Done' }],
      });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.getIssue('BT-W2-1')).resolves.toMatchObject({
      key: 'BT-W2-1',
      provider: 'yandex-tracker',
      summary: 'Issue',
    });
    await expect(client.getIssueChecklist('BT-W2-1')).resolves.toEqual([
      { checked: true, checklistItemType: 'standard', id: 'c1', text: 'Done' },
    ]);
    expect(get).toHaveBeenCalledWith('/issues/BT-W2-1');
    expect(get).toHaveBeenCalledWith('/issues/BT-W2-1/checklistItems');
  });
});
