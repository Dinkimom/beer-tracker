import { describe, expect, it, vi } from 'vitest';

import { UnsupportedIssueTrackerOperationError } from './errors';
import {
  JIRA_IMPLEMENTED_PROVIDER_METHODS,
  createJiraProviderClient,
  createJiraUnsupportedProviderClient,
  jiraTrackerProvider,
} from './jiraProvider';

vi.mock('./jiraMyself', () => ({
  fetchJiraCurrentUser: vi.fn(() =>
    Promise.resolve({
      avatarUrl: null,
      display: 'Ada',
      email: 'ada@example.com',
      emailAddress: 'ada@example.com',
      firstName: 'Ada',
      lastName: '',
      login: 'ada',
      trackerUid: 'ada',
      uid: 'ada',
    })
  ),
}));

vi.mock('./jiraSprints', () => ({
  createJiraSprint: vi.fn(() =>
    Promise.resolve({ id: 99, name: 'New sprint', status: 'draft' })
  ),
  fetchJiraSprintInfo: vi.fn(() =>
    Promise.resolve({
      endDate: '2026-09-11',
      endDateTime: '2026-09-11T00:00:00.000+0000',
      id: 55,
      name: 'Sprint 55',
      startDate: '2026-08-31',
      startDateTime: '2026-08-31T00:00:00.000+0000',
      status: 'in_progress',
      version: 1,
    })
  ),
  listJiraSprints: vi.fn((_api: unknown, boardId: number) =>
    Promise.resolve([{ id: 55, name: `Sprint on ${boardId}` }])
  ),
  updateJiraSprintStatus: vi.fn(() =>
    Promise.resolve({
      boardId: 14684,
      endDate: '2026-09-11',
      endDateTime: '2026-09-11T00:00:00.000+0000',
      id: 83866,
      name: 'Sprint 83866',
      startDate: '2026-08-31',
      startDateTime: '2026-08-31T00:00:00.000+0000',
      status: 'in_progress',
      version: 1,
    })
  ),
}));

vi.mock('./jiraUserSearch', () => ({
  searchJiraUsers: vi.fn((_api: unknown, query: string) =>
    Promise.resolve(
      query.trim().length < 2
        ? []
        : [{ displayName: 'Ada', email: 'ada@example.com', trackerId: 'acc-1' }]
    )
  ),
}));

vi.mock('./jiraIssueCreate', () => ({
  createJiraIssue: vi.fn(() =>
    Promise.resolve({ id: '10050', key: 'PROJ-50', self: 'https://jira.example.com/issue/10050' })
  ),
}));

vi.mock('./jiraIssueUpdate', () => ({
  updateJiraIssue: vi.fn(() => Promise.resolve({})),
}));

vi.mock('./jiraTransitions', () => ({
  fetchJiraIssueTransitions: vi.fn(() =>
    Promise.resolve([
      { display: 'Start Progress', id: '21', to: { display: 'In Progress', key: 'inProgress' } },
    ])
  ),
  fetchJiraIssueTransitionsBatch: vi.fn(() =>
    Promise.resolve({
      'PROJ-1': [
        { display: 'Start Progress', id: '21', to: { display: 'In Progress', key: 'inProgress' } },
      ],
    })
  ),
  fetchJiraQueueWorkflowScreens: vi.fn(() => Promise.resolve({})),
  fetchJiraTransitionFields: vi.fn(() => Promise.resolve([])),
  transitionJiraIssue: vi.fn(() => Promise.resolve()),
}));

vi.mock('./jiraIssues', () => ({
  fetchJiraIssue: vi.fn(() =>
    Promise.resolve({
      key: 'PROJ-1',
      provider: 'jira',
      sprint: [{ display: 'Booking 12', id: '78804' }],
      summary: 'Fix login',
    })
  ),
  normalizeJiraIssue: (issue: { key: string; summary: string; type?: { key: string } }) => ({
    ...issue,
    provider: 'jira',
  }),
  searchJiraIssuesInSprint: vi.fn(() =>
    Promise.resolve([
      { id: '10001', key: 'PROJ-1', self: '', summary: 'Fix login', type: { key: 'task' } },
    ])
  ),
}));

vi.mock('./jiraIssueList', () => ({
  listJiraIssuesForBoard: vi.fn(() =>
    Promise.resolve({
      issues: [{ id: '10001', key: 'PROJ-1', self: '', summary: 'On board' }],
      truncated: false,
    })
  ),
  listJiraIssuesForQueue: vi.fn(() =>
    Promise.resolve({
      issues: [{ id: '10001', key: 'PROJ-1', self: '', summary: 'In queue' }],
      truncated: false,
    })
  ),
  listJiraIssuesUpdatedInRange: vi.fn(() =>
    Promise.resolve({
      issues: [{ id: '10001', key: 'PROJ-1', self: '', summary: 'Updated' }],
      truncated: false,
    })
  ),
}));

vi.mock('./jiraChangelog', () => ({
  addJiraIssueComment: vi.fn(() => Promise.resolve()),
  fetchJiraBurndownIssuesForKeys: vi.fn(() =>
    Promise.resolve([{ issueKey: 'PROJ-1', statusKey: 'done', storyPoints: 1 }])
  ),
  fetchJiraIssueChangelogWithComments: vi.fn(() =>
    Promise.resolve({ changelog: [], comments: [] })
  ),
  fetchJiraIssuesChangelogBatch: vi.fn(() =>
    Promise.resolve({ 'PROJ-1': { changelog: [], comments: [] } })
  ),
}));

vi.mock('./jiraCatalog', () => ({
  fetchJiraBoardsForCatalog: vi.fn(() => Promise.resolve([{ id: 15116, name: 'Booking' }])),
  fetchJiraProjectsAsQueues: vi.fn(() =>
    Promise.resolve([{ key: 'PROJ', name: 'Booking' }])
  ),
}));

vi.mock('./jiraBoardParams', () => ({
  fetchJiraBoardParams: vi.fn((_api: unknown, boardId: number) =>
    Promise.resolve({
      columns: [
        {
          display: 'To Do',
          id: '1',
          self: `https://jira.example.com/rest/agile/1.0/board/${boardId}/columns/1`,
          statusKeys: ['todo', '10000'],
        },
      ],
      id: boardId,
      name: 'Booking',
      self: `https://jira.example.com/rest/agile/1.0/board/${boardId}`,
    })
  ),
}));

vi.mock('./jiraIssueSprintMembership', () => ({
  addJiraIssueToSprint: vi.fn(() =>
    Promise.resolve({ affectedSprintIds: [78804], backlogBoardIds: [15116] })
  ),
  removeJiraIssueFromSprint: vi.fn(() =>
    Promise.resolve({ affectedSprintIds: [78804], backlogBoardIds: [15116] })
  ),
  replaceJiraIssueSprints: vi.fn(() =>
    Promise.resolve({ affectedSprintIds: [78803, 78804], backlogBoardIds: [15116] })
  ),
}));

vi.mock('./jiraQueues', () => ({
  fetchJiraQueueByKey: vi.fn((_api: unknown, queueKey: string) =>
    Promise.resolve({ id: 10100, key: queueKey, name: 'Booking' })
  ),
  fetchJiraQueueWorkflows: vi.fn((_api: unknown, queueKey: string) =>
    Promise.resolve({
      [queueKey]: [{ display: 'Task', id: '1', key: 'task' }],
    })
  ),
  searchJiraQueues: vi.fn((_api: unknown, query: string) =>
    Promise.resolve(query.trim() ? [{ key: 'PROJ', name: 'Booking' }] : [])
  ),
}));

vi.mock('./jiraIssueSearch', () => ({
  searchJiraIssuesOnBoard: vi.fn((_api: unknown, boardId: number, query: string) =>
    Promise.resolve(
      query.trim()
        ? [{ id: '10001', key: 'PROJ-1', self: '', summary: `Hit on ${boardId}` }]
        : []
    )
  ),
}));

vi.mock('@/lib/trackerApi/issues', () => ({
  mapTrackerIssueToTask: vi.fn((issue: { key: string; summary: string }) => ({
    id: issue.key,
    name: issue.summary,
  })),
}));

describe('jiraTrackerProvider skeleton', () => {
  it('exposes jira kind', () => {
    expect(jiraTrackerProvider.kind).toBe('jira');
  });

  it('throws UnsupportedIssueTrackerOperationError for unimplemented methods', async () => {
    const client = createJiraProviderClient({
      apiToken: 'token',
      email: 'user@example.com',
    });

    await expect(client.getField('customfield_1')).rejects.toBeInstanceOf(
      UnsupportedIssueTrackerOperationError
    );
  });

  it('is not thenable', async () => {
    const client = createJiraProviderClient({
      apiToken: 'token',
      email: 'user@example.com',
    });
    expect(Reflect.get(client, 'then')).toBeUndefined();
    await expect(Promise.resolve(client)).resolves.toBe(client);
  });

  it('implements getIssue, transitions, updateIssue, listSprintIssues and searchUsers', async () => {
    const client = createJiraProviderClient({
      apiToken: 'token',
      email: 'user@example.com',
    });
    await expect(client.getCurrentUser()).resolves.toMatchObject({ display: 'Ada', uid: 'ada' });
    await expect(client.listSprints(14684)).resolves.toEqual([
      { id: 55, name: 'Sprint on 14684' },
    ]);
    await expect(client.searchUsers('ada@example.com')).resolves.toEqual([
      { displayName: 'Ada', email: 'ada@example.com', trackerId: 'acc-1' },
    ]);
    await expect(client.listSprintIssues(78804)).resolves.toEqual([
      expect.objectContaining({ key: 'PROJ-1', provider: 'jira', summary: 'Fix login' }),
    ]);
    await expect(client.getIssue('PROJ-1')).resolves.toEqual(
      expect.objectContaining({ key: 'PROJ-1', provider: 'jira' })
    );
    await expect(client.getIssueChecklist('PROJ-1')).rejects.toMatchObject({
      operation: 'getIssueChecklist',
      providerKind: 'jira',
    });
    await expect(client.getSprint(55)).resolves.toMatchObject({ id: 55, status: 'in_progress' });
    await expect(client.updateSprintStatus(83866, 'in_progress')).resolves.toMatchObject({
      boardId: 14684,
      id: 83866,
      status: 'in_progress',
    });
    await expect(client.getBoard(15116)).resolves.toEqual({
      columns: [
        {
          display: 'To Do',
          id: '1',
          self: 'https://jira.example.com/rest/agile/1.0/board/15116/columns/1',
          statusKeys: ['todo', '10000'],
        },
      ],
      id: 15116,
      name: 'Booking',
      self: 'https://jira.example.com/rest/agile/1.0/board/15116',
    });
    await expect(client.listBoards()).resolves.toEqual([{ id: 15116, name: 'Booking' }]);
    await expect(client.listQueues()).resolves.toEqual([{ key: 'PROJ', name: 'Booking' }]);
    await expect(client.searchQueues('book')).resolves.toEqual([{ key: 'PROJ', name: 'Booking' }]);
    await expect(client.listIssuesForBoard(15116)).resolves.toEqual({
      issues: [expect.objectContaining({ key: 'PROJ-1', provider: 'jira' })],
      truncated: false,
    });
    await expect(client.listIssuesForQueue('PROJ')).resolves.toEqual({
      issues: [expect.objectContaining({ key: 'PROJ-1', provider: 'jira' })],
      truncated: false,
    });
    await expect(
      client.listIssuesUpdatedInRange(new Date('2026-03-01T00:00:00Z'), new Date())
    ).resolves.toEqual({
      issues: [expect.objectContaining({ key: 'PROJ-1', provider: 'jira' })],
      truncated: false,
    });
    await expect(client.getIssueChangelogWithComments('PROJ-1')).resolves.toEqual({
      changelog: [],
      comments: [],
    });
    await expect(client.addIssueComment('PROJ-1', 'hi')).resolves.toBeUndefined();
    await expect(client.addIssueToSprint('PROJ-1', 78804)).resolves.toEqual({
      affectedSprintIds: [78804],
      backlogBoardIds: [15116],
    });
    await expect(client.createIssue({ queue: 'PROJ', summary: 'Created' })).resolves.toEqual({
      id: '10050',
      key: 'PROJ-50',
      self: 'https://jira.example.com/issue/10050',
    });
    await expect(
      client.createSprint({
        boardId: 15116,
        endDate: '2026-09-17',
        name: 'New sprint',
        startDate: '2026-09-03',
      })
    ).resolves.toEqual({ id: 99, name: 'New sprint', status: 'draft' });
    await expect(client.updateIssue('PROJ-1', { storyPoints: 5 })).resolves.toEqual({});
    await expect(client.getIssueTransitions('PROJ-1')).resolves.toEqual([
      { display: 'Start Progress', id: '21', to: { display: 'In Progress', key: 'inProgress' } },
    ]);
    await expect(client.listIssueTransitionsBatch(['PROJ-1'])).resolves.toEqual({
      'PROJ-1': [
        { display: 'Start Progress', id: '21', to: { display: 'In Progress', key: 'inProgress' } },
      ],
    });
    await expect(client.getQueue('PROJ')).resolves.toEqual({
      id: 10100,
      key: 'PROJ',
      name: 'Booking',
    });
    await expect(client.getQueueWorkflows('PROJ')).resolves.toEqual({
      PROJ: [{ display: 'Task', id: '1', key: 'task' }],
    });
    await expect(client.getQueueWorkflowScreens('PROJ')).resolves.toEqual({});
    await expect(client.getTransitionFields('PROJ-1', '21')).resolves.toEqual([]);
    await expect(client.transitionIssue('PROJ-1', '21', {})).resolves.toBeUndefined();
    await expect(client.searchIssuesOnBoard(15116, 'редиз')).resolves.toEqual([
      expect.objectContaining({ key: 'PROJ-1', provider: 'jira', summary: 'Hit on 15116' }),
    ]);
    expect(
      client.mapIssueToTask({
        id: 'PROJ-1',
        key: 'PROJ-1',
        provider: 'jira',
        summary: 'Fix login',
      })
    ).toMatchObject({ id: 'PROJ-1', name: 'Fix login' });
    expect(JIRA_IMPLEMENTED_PROVIDER_METHODS).toEqual([
      'addIssueComment',
      'addIssueToSprint',
      'createIssue',
      'createSprint',
      'getBoard',
      'getBurndownIssuesForKeys',
      'getCurrentUser',
      'getIssue',
      'getIssueChangelogWithComments',
      'getIssuesChangelogBatch',
      'getIssueTransitions',
      'getQueue',
      'getQueueWorkflowScreens',
      'getQueueWorkflows',
      'getSprint',
      'getTasksInSprintWithParents',
      'getTransitionFields',
      'listBoards',
      'listIssueTransitionsBatch',
      'listIssuesForBoard',
      'listIssuesForQueue',
      'listIssuesUpdatedInRange',
      'listQueues',
      'listSprintIssues',
      'listSprints',
      'mapIssueToTask',
      'removeIssueFromSprint',
      'replaceIssueSprints',
      'searchIssuesOnBoard',
      'searchQueues',
      'searchUsers',
      'transitionIssue',
      'updateIssue',
      'updateSprintStatus',
    ]);
  });

  it('uses the same unsupported client from factory helper', async () => {
    const client = createJiraUnsupportedProviderClient();
    await expect(client.getIssue('JIRA-1')).rejects.toMatchObject({
      operation: 'getIssue',
      providerKind: 'jira',
      status: 422,
    });
  });
});
