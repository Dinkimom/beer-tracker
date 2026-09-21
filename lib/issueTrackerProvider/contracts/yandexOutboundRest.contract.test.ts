import type { IssueTrackerProviderClient } from '../types';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTrackerAxiosInstance } from '@/lib/trackerAxiosFactory';

import { createYandexProviderClient } from '../yandexTrackerProvider';

vi.mock('@/lib/trackerAxiosFactory', () => ({
  createTrackerAxiosInstance: vi.fn((config: unknown) => ({ config })),
  requireTrackerAxiosForApiRoute: vi.fn((client: unknown) => client),
}));

type AxiosMethod = 'delete' | 'get' | 'patch' | 'post' | 'put';

interface OutboundCase {
  args: unknown[];
  method: AxiosMethod;
  name: keyof IssueTrackerProviderClient;
  url: string;
}

const YANDEX_ADAPTER_OUTBOUND: OutboundCase[] = [
  { args: ['BT-1', 'hello'], method: 'post', name: 'addIssueComment', url: '/issues/BT-1/comments' },
  {
    args: [{ queue: 'BT', summary: 'Created' }],
    method: 'post',
    name: 'createIssue',
    url: '/issues',
  },
  {
    args: ['BT-1', { text: 'item' }],
    method: 'post',
    name: 'createChecklistItem',
    url: '/issues/BT-1/checklistItems',
  },
  {
    args: [{ boardId: 7, endDate: '2026-06-26', name: 'Sprint', startDate: '2026-06-15' }],
    method: 'post',
    name: 'createSprint',
    url: '/sprints',
  },
  { args: ['BT-1'], method: 'delete', name: 'deleteChecklist', url: '/issues/BT-1/checklistItems' },
  {
    args: ['BT-1', 'c1'],
    method: 'delete',
    name: 'deleteChecklistItem',
    url: '/issues/BT-1/checklistItems/c1',
  },
  { args: ['BT-100'], method: 'get', name: 'getIssue', url: '/issues/BT-100' },
  { args: [], method: 'get', name: 'getCurrentUser', url: '/myself' },
  { args: [7], method: 'get', name: 'listSprints', url: '/boards/7/sprints' },
  {
    args: ['BT-1', []],
    method: 'put',
    name: 'replaceChecklistItems',
    url: '/issues/BT-1/checklistItems',
  },
  {
    args: ['BT-1', 'startProgress', { comment: 'go' }],
    method: 'post',
    name: 'transitionIssue',
    url: 'https://api.tracker.yandex.net/v3/issues/BT-1/transitions/startProgress/_execute',
  },
  {
    args: ['BT-1', 'c1', { checked: true }],
    method: 'patch',
    name: 'updateChecklistItem',
    url: '/issues/BT-1/checklistItems/c1',
  },
  {
    args: ['BT-1', { summary: 'Renamed' }],
    method: 'patch',
    name: 'updateIssue',
    url: '/issues/BT-1',
  },
  {
    args: [83866, 'in_progress'],
    method: 'patch',
    name: 'updateSprintStatus',
    url: '/sprints/83866',
  },
];

function createMockAxios() {
  return {
    delete: vi.fn().mockResolvedValue({ data: {} }),
    get: vi.fn().mockResolvedValue({
      data: { id: 'BT-100', key: 'BT-100', self: 'https://tracker.test/BT-100', summary: 'Issue' },
    }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: { key: 'BT-1' } }),
    put: vi.fn().mockResolvedValue({ data: {} }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Yandex adapter outbound REST contract', () => {
  it.each(YANDEX_ADAPTER_OUTBOUND)('$name calls $method $url', async ({ args, method, name, url }) => {
    const http = createMockAxios();
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce(http as never);
    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    const impl = client[name] as (...callArgs: unknown[]) => Promise<unknown>;
    await impl(...args);

    expect(http[method].mock.calls[0]?.[0]).toBe(url);
  });

  it('posts createSprint with Yandex board id as string', async () => {
    const http = createMockAxios();
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce(http as never);
    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await client.createSprint({
      boardId: 7,
      endDate: '2026-06-26',
      name: 'Sprint',
      startDate: '2026-06-15',
    });

    expect(http.post).toHaveBeenCalledWith('/sprints', {
      board: { id: '7' },
      endDate: '2026-06-26',
      name: 'Sprint',
      startDate: '2026-06-15',
    });
  });

  it('posts createIssue with the Yandex issue body', async () => {
    const http = createMockAxios();
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce(http as never);
    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await client.createIssue({ queue: 'BT', summary: 'Created' });

    expect(http.post).toHaveBeenCalledWith('/issues', {
      queue: 'BT',
      summary: 'Created',
    });
  });

  it('posts comments as { text }', async () => {
    const http = createMockAxios();
    vi.mocked(createTrackerAxiosInstance).mockReturnValueOnce(http as never);
    const client = createYandexProviderClient({
      oauthToken: 'token-1',
      orgId: 'org-1',
    });

    await client.addIssueComment('BT-1', 'hello');

    expect(http.post).toHaveBeenCalledWith('/issues/BT-1/comments', { text: 'hello' });
  });
});
