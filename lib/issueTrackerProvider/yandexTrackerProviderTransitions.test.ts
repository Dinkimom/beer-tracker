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

describe('yandexTrackerProvider transitions', () => {
  it('searches issues on a board', async () => {
    const post = vi.fn().mockResolvedValueOnce({
      data: [{ id: 'BT-W2-2', key: 'BT-W2-2', summary: 'Search result', SomeCustomField: 13 }],
    });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ post } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.searchIssuesOnBoard(7, 'BT-W2')).resolves.toMatchObject([
      {
        customFields: { SomeCustomField: 13 },
        key: 'BT-W2-2',
        provider: 'yandex-tracker',
        summary: 'Search result',
      },
    ]);
    expect(post).toHaveBeenCalledWith('/issues/_search?expand=links&perPage=20&page=1', {
      query: 'boards: 7 AND (Summary: "BT-W2*" OR Key: "BT-W2")',
    });
  });

  it('fetches children issues for parent and board', async () => {
    const post = vi.fn().mockResolvedValueOnce({
      data: [{ key: 'BT-W2-3', summary: 'Child' }],
      headers: {},
    });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ post } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.getIssueChildren('BT-W2-P', 7)).resolves.toMatchObject([
      { key: 'BT-W2-3', provider: 'yandex-tracker', summary: 'Child' },
    ]);
    expect(post).toHaveBeenCalledWith('/issues/_search?expand=links&perPage=300&page=1', {
      query: 'boards: 7 AND (type: task OR type: bug OR type: story) AND "Is Subtask For": BT-W2-P',
    });
  });

  it('fetches issue transitions', async () => {
    const get = vi.fn().mockResolvedValueOnce({
      data: [
        {
          display: 'Start Progress',
          id: 'startProgress',
          screen: { id: 'screen-1' },
          to: { key: 'inProgress', display: 'In Progress' },
        },
      ],
    });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.getIssueTransitions('BT-W3-1')).resolves.toEqual([
      {
        display: 'Start Progress',
        id: 'startProgress',
        screen: { id: 'screen-1' },
        to: { key: 'inProgress', display: 'In Progress' },
      },
    ]);
    expect(get).toHaveBeenCalledWith(
      'https://api.tracker.yandex.net/v3/issues/BT-W3-1/transitions'
    );
  });

  it('fetches issue transitions in batches', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            id: 'startProgress',
            to: { key: 'inProgress', display: 'In Progress' },
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'close',
            to: { key: 'closed', display: 'Closed' },
          },
        ],
      });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(
      client.listIssueTransitionsBatch(['BT-W3-1', 'BT-W3-2'])
    ).resolves.toEqual({
      'BT-W3-1': [
        {
          id: 'startProgress',
          to: { key: 'inProgress', display: 'In Progress' },
        },
      ],
      'BT-W3-2': [
        {
          id: 'close',
          to: { key: 'closed', display: 'Closed' },
        },
      ],
    });
    expect(get).toHaveBeenCalledWith(
      'https://api.tracker.yandex.net/v3/issues/BT-W3-1/transitions'
    );
    expect(get).toHaveBeenCalledWith(
      'https://api.tracker.yandex.net/v3/issues/BT-W3-2/transitions'
    );
  });

  it('fetches and enriches transition fields with workflow resolutions', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            id: 'startProgress',
            screen: { id: 'transition-fields-screen-1' },
            to: { key: 'inProgress', display: 'In Progress' },
          },
        ],
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
          key: 'BT-W3-1',
          queue: { key: 'BT-W3' },
          type: { key: 'task' },
        },
      })
      .mockResolvedValueOnce({
        data: {
          issueTypesConfig: [
            {
              issueType: { key: 'task' },
              resolutions: [
                { key: 'fixed', display: 'Решен' },
                { key: 'wontFix', display: 'Не будет исправлено' },
              ],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: 'resolution',
          name: 'Резолюция',
          schema: { required: false, type: 'resolution' },
        },
      });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(
      client.getTransitionFields('BT-W3-1', 'startProgress')
    ).resolves.toEqual([
      {
        display: 'Резолюция',
        id: 'resolution',
        options: [
          { label: 'Решен', value: 'fixed' },
          { label: 'Не будет исправлено', value: 'wontFix' },
        ],
        required: true,
        schemaType: 'resolution',
      },
    ]);
    expect(get).toHaveBeenCalledWith(
      'https://api.tracker.yandex.net/v3/issues/BT-W3-1/transitions'
    );
    expect(get).toHaveBeenCalledWith(
      'https://api.tracker.yandex.net/v3/screens/transition-fields-screen-1'
    );
    expect(get).toHaveBeenCalledWith('https://api.tracker.yandex.net/v3/issues/BT-W3-1');
    expect(get).toHaveBeenCalledWith('https://api.tracker.yandex.net/v3/queues/BT-W3', {
      params: { expand: 'issueTypesConfig' },
    });
    expect(get).toHaveBeenCalledWith('https://api.tracker.yandex.net/v3/fields/resolution');
  });

  it('updates a checklist item', async () => {
    const patch = vi.fn().mockResolvedValueOnce({ data: {} });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ patch } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(
      client.updateChecklistItem('BT-W4-1', 'item-1', {
        checked: true,
        text: 'Updated checklist item',
      })
    ).resolves.toBeUndefined();
    expect(patch).toHaveBeenCalledWith('/issues/BT-W4-1/checklistItems/item-1', {
      checked: true,
      text: 'Updated checklist item',
    });
  });

  it('creates a checklist item', async () => {
    const post = vi.fn().mockResolvedValueOnce({
      data: { checked: false, id: 'item-1', text: 'New checklist item' },
    });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ post } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(
      client.createChecklistItem('BT-W4-1', {
        checked: false,
        text: 'New checklist item',
      })
    ).resolves.toEqual({ checked: false, id: 'item-1', text: 'New checklist item' });
    expect(post).toHaveBeenCalledWith('/issues/BT-W4-1/checklistItems', {
      checked: false,
      text: 'New checklist item',
    });
  });

  it('replaces checklist items order', async () => {
    const put = vi.fn().mockResolvedValueOnce({
      data: [{ id: 'item-2' }, { id: 'item-1' }],
    });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ put } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    const items = [{ id: 'item-2' }, { id: 'item-1' }];
    await expect(client.replaceChecklistItems('BT-W4-1', items)).resolves.toEqual(items);
    expect(put).toHaveBeenCalledWith('/issues/BT-W4-1/checklistItems', items);
  });

  it('updates an issue with a provider patch', async () => {
    const patch = vi.fn().mockResolvedValueOnce({
      data: { key: 'BT-W4-2', summary: 'Updated issue' },
    });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ patch } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(
      client.updateIssue('BT-W4-2', {
        storyPoints: 5,
        testPoints: null,
      })
    ).resolves.toEqual({ key: 'BT-W4-2', summary: 'Updated issue' });
    expect(patch).toHaveBeenCalledWith('/issues/BT-W4-2', {
      storyPoints: 5,
      testPoints: null,
    });
  });

  it('maps domain assigneeId onto a Yandex user ref', async () => {
    const patch = vi.fn().mockResolvedValueOnce({ data: { key: 'BT-W4-2' } });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ patch } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(
      client.updateIssue('BT-W4-2', { assigneeId: 'u1', isQa: true })
    ).resolves.toEqual({ key: 'BT-W4-2' });
    expect(patch).toHaveBeenCalledWith('/issues/BT-W4-2', {
      qaEngineer: { id: 'u1' },
    });
  });

  it('executes an issue transition', async () => {
    const post = vi.fn().mockResolvedValueOnce({ data: {} });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ post } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(
      client.transitionIssue('BT-W4-3', 'startProgress', {
        comment: 'Moving forward',
        resolution: 'fixed',
      })
    ).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith(
      'https://api.tracker.yandex.net/v3/issues/BT-W4-3/transitions/startProgress/_execute',
      {
        comment: 'Moving forward',
        resolution: 'fixed',
      }
    );
  });

  it('adds an issue to a sprint and replaces same-board sprint membership', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: { sprint: [{ id: '1' }, { id: '2' }] } })
      .mockResolvedValueOnce({ data: { board: { id: 20 } } })
      .mockResolvedValueOnce({ data: { board: { id: 20 } } })
      .mockResolvedValueOnce({ data: { board: { id: 30 } } });
    const patch = vi.fn().mockResolvedValueOnce({ data: {} });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get, patch } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.addIssueToSprint('BT-W4-4', 3)).resolves.toEqual({
      affectedSprintIds: [2, 3, 1],
      backlogBoardIds: [20],
    });
    expect(patch).toHaveBeenCalledWith('/issues/BT-W4-4', {
      sprint: [{ id: '2' }, { id: '3' }],
    });
  });

  it('removes an issue from a sprint', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: { board: { id: 20 } } })
      .mockResolvedValueOnce({ data: { sprint: [{ id: '2' }, { id: '3' }] } });
    const patch = vi.fn().mockResolvedValueOnce({ data: {} });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get, patch } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.removeIssueFromSprint('BT-W4-4', '3')).resolves.toEqual({
      affectedSprintIds: [3, 2],
      backlogBoardIds: [20],
    });
    expect(patch).toHaveBeenCalledWith('/issues/BT-W4-4', {
      sprint: [{ id: '2' }],
    });
  });

  it('replaces issue sprints', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: { sprint: [{ id: '1' }] } })
      .mockResolvedValueOnce({ data: { board: { id: 10 } } })
      .mockResolvedValueOnce({ data: { board: { id: 40 } } });
    const patch = vi.fn().mockResolvedValueOnce({ data: {} });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ get, patch } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.replaceIssueSprints('BT-W4-4', [{ id: '4' }])).resolves.toEqual({
      affectedSprintIds: [1, 4],
      backlogBoardIds: [10, 40],
    });
    expect(patch).toHaveBeenCalledWith('/issues/BT-W4-4', {
      sprint: [{ id: '4' }],
    });
  });

  it('deletes a checklist', async () => {
    const del = vi.fn().mockResolvedValueOnce({ data: {} });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ delete: del } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.deleteChecklist('BT-W4-1')).resolves.toBeUndefined();
    expect(del).toHaveBeenCalledWith('/issues/BT-W4-1/checklistItems');
  });

  it('deletes a checklist item', async () => {
    const del = vi.fn().mockResolvedValueOnce({ data: {} });
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce({ delete: del } as never);

    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await expect(client.deleteChecklistItem('BT-W4-1', 'item-1')).resolves.toBeUndefined();
    expect(del).toHaveBeenCalledWith('/issues/BT-W4-1/checklistItems/item-1');
  });
});
