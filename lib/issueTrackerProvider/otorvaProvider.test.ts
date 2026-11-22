import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { storedIssueSnapshotForUpsert } from '@/lib/snapshots/issueSnapshotWrite';

import { mapIssueSnapshotPayloadToTask } from './issueSnapshotMapper';
import { OTORVA_DEFAULT_API_URL } from './otorvaApi';
import { createOtorvaProviderClient } from './otorvaProvider';
import { yandexIssueFromProviderIssue } from './yandexTrackerProviderHelpers';

const STATUS = {
  backlog: { category: 'todo', id: 's-backlog', is_initial: true, is_terminal: false, name: 'Беклог', sort_order: 0, workflow_id: 'wf' },
  closed: { category: 'done', id: 's-closed', is_initial: false, is_terminal: true, name: 'Закрыта', sort_order: 8, workflow_id: 'wf' },
  ready: { category: 'todo', id: 's-ready', is_initial: false, is_terminal: false, name: 'Готово к работе', sort_order: 1, workflow_id: 'wf' },
  work: { category: 'in_progress', id: 's-work', is_initial: false, is_terminal: false, name: 'В работе', sort_order: 2, workflow_id: 'wf' },
};

function task(overrides: Record<string, unknown>) {
  return {
    assignee_id: null,
    created_at: '2026-11-20T10:00:00Z',
    description: '',
    end_date: null,
    parent_id: null,
    queue_id: 'q-demo',
    sprint_ids: [],
    start_date: null,
    status_id: 'story-backlog',
    story_points: null,
    task_type_id: 'tt-task',
    test_points: null,
    updated_at: '2026-11-21T10:00:00Z',
    ...overrides,
  };
}

const EPIC = task({ id: 't-epic', key: 'DEMO-1', task_type_id: 'tt-epic', title: 'Epic' });
const CHILD = task({
  assignee_id: 'p-ada',
  end_date: '2026-11-27',
  id: 't-child',
  key: 'DEMO-2',
  parent_id: 't-epic',
  sprint_ids: [7],
  start_date: '2026-11-23',
  status_id: 's-work',
  story_points: 3,
  test_points: 1,
  title: 'Child',
});

const ROUTES: Record<string, unknown> = {
  '/auth/me': { email: 'ada@local.test', first_name: 'Ada', id: 'p-ada', is_admin: true, last_name: 'Admin', photo: null },
  '/boards/1': { id: 1, name: 'Team', queue_ids: ['q-demo'] },
  '/boards/1/sprints': [
    { author_id: 'p-ada', board_id: 1, created_at: '2026-11-20T09:00:00Z', end_date: '2026-12-04', goal: '', id: 7, name: 'S7', start_date: '2026-11-23', status: 'in_progress', version: 3 },
  ],
  '/profiles': [{ first_name: 'Ada', id: 'p-ada', is_admin: true, last_name: 'Admin', photo: null }],
  '/queues': [{ id: 'q-demo', key: 'DEMO', name: 'Demo' }],
  '/sprints/7': { author_id: 'p-ada', board_id: 1, created_at: '2026-11-20T09:00:00Z', end_date: '2026-12-04', goal: '', id: 7, name: 'S7', start_date: '2026-11-23', status: 'in_progress', version: 3 },
  '/task-events': [
    {
      author: { display: 'Ada Admin', id: 'p-ada' },
      changes: [
        { field: 'status', from: { display: 'Беклог', id: 's-backlog' }, to: { display: 'В работе', id: 's-work' } },
        { field: 'story_points', from: 2, to: 3 },
        { field: 'sprints', from: [], to: [{ display: 'S7', id: '7' }] },
      ],
      created_at: '2026-11-21T10:00:00Z',
      id: 11,
      kind: 'updated',
      task_key: 'DEMO-2',
    },
  ],
  '/task-types': [
    { id: 'tt-task', key: 'task', name: 'Задача' },
    { id: 'tt-epic', key: 'epic', name: 'Эпик' },
  ],
  '/tasks': [CHILD, EPIC],
  '/tasks/by-key/DEMO-2': {
    ...CHILD,
    available_transitions: [STATUS.closed],
    links: [{ from_task_id: 't-child', id: 'l-1', link_type_id: 'lt', to_task_id: 't-epic' }],
  },
  '/sprints/8': { author_id: null, board_id: 2, created_at: '2026-11-20T09:00:00Z', end_date: '2026-12-18', goal: '', id: 8, name: 'S8', start_date: '2026-12-07', status: 'draft', version: 1 },
  '/sprints/9': { author_id: null, board_id: 1, created_at: '2026-11-20T09:00:00Z', end_date: '2026-12-18', goal: '', id: 9, name: 'S9', start_date: '2026-12-07', status: 'draft', version: 1 },
  '/tasks/by-key/DEMO-1': { ...EPIC, available_transitions: [], links: [], sprint_ids: [] },
  '/tasks/t-epic': EPIC,
  '/workflows': [{ id: 'wf' }],
  '/workflows/wf': { statuses: Object.values(STATUS), task_type_id: 'tt-task' },
};

let requests: InternalAxiosRequestConfig[] = [];

const adapter: AxiosAdapter = (config) => {
  requests.push(config);
  const path = config.url ?? '';
  if (config.method && config.method !== 'get') {
    return Promise.resolve({ config, data: { id: 'written', key: 'DEMO-9' }, headers: {}, status: 200, statusText: '' } as AxiosResponse);
  }
  const data = path in ROUTES ? ROUTES[path] : undefined;
  if (data === undefined) {
    const response = { config, data: { error: 'not found' }, headers: {}, status: 404, statusText: '' } as AxiosResponse;
    return Promise.reject(new axios.AxiosError('not found', 'ERR_BAD_REQUEST', config, null, response));
  }
  return Promise.resolve({ config, data, headers: {}, status: 200, statusText: '' } as AxiosResponse);
};

function client() {
  return createOtorvaProviderClient({ apiUrl: OTORVA_DEFAULT_API_URL, organizationId: 'org-1', token: 'jwt-1' });
}

describe('otorva provider client (read)', () => {
  beforeEach(() => {
    requests = [];
    const create = axios.create.bind(axios);
    vi.spyOn(axios, 'create').mockImplementation((config) => create({ ...config, adapter }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the user JWT to the configured API', async () => {
    const user = await client().getCurrentUser();
    expect(user).toMatchObject({ display: 'Ada Admin', email: 'ada@local.test', trackerUid: 'p-ada', uid: 'p-ada' });
    expect(requests[0]?.baseURL).toBe(OTORVA_DEFAULT_API_URL);
    expect(requests[0]?.headers.Authorization).toBe('Bearer jwt-1');
  });

  it('maps a task with status, type, assignee, parent, sprint, estimates, dates and queue', async () => {
    const issue = await client().getIssue('DEMO-2');
    expect(issue).toMatchObject({
      assignee: { display: 'Ada Admin', id: 'p-ada' },
      customFields: { queue: { display: 'Demo', key: 'DEMO' } },
      deadline: '2026-11-27',
      key: 'DEMO-2',
      parent: { display: 'Epic', id: 't-epic', key: 'DEMO-1' },
      provider: 'otorva',
      sprint: [{ display: 'S7', id: '7' }],
      start: '2026-11-23',
      status: { display: 'В работе', id: 's-work', key: 'в работе' },
      statusType: { key: 'inProgress' },
      storyPoints: 3,
      summary: 'Child',
      testPoints: 1,
      type: { display: 'Задача', key: 'task' },
    });
    await expect(client().getIssue('DEMO-404')).resolves.toBeNull();
  });

  it('survives the sync snapshot round trip: card from the snapshot equals the direct card', async () => {
    const c = client();
    const issue = (await c.getIssue('DEMO-2'))!;
    const web = { kind: 'otorva' as const, webBaseUrl: '' };
    const stored = storedIssueSnapshotForUpsert(yandexIssueFromProviderIssue(issue), 'otorva').storedPayload;
    const fromSnapshot = mapIssueSnapshotPayloadToTask(JSON.parse(JSON.stringify(stored)), web);
    const direct = c.mapIssueToTask(issue);
    for (const field of ['id', 'name', 'status', 'originalStatus', 'statusTypeKey', 'storyPoints', 'testPoints', 'assignee', 'assigneeName', 'trackerQueue', 'link'] as const) {
      expect(fromSnapshot[field], field).toEqual(direct[field]);
    }
    expect(fromSnapshot.parent?.key ?? fromSnapshot.parent?.id).toBe('DEMO-1');
    expect(fromSnapshot.sprints).toEqual([{ display: 'S7', id: '7' }]);
  });

  it('turns the issue into a planner card without a web link', async () => {
    const c = client();
    const card = c.mapIssueToTask((await c.getIssue('DEMO-2'))!);
    expect(card).toMatchObject({ id: 'DEMO-2', link: '', status: 'in-progress', storyPoints: 3, trackerQueue: 'DEMO' });
  });

  it('lists board and sprint tasks with the right filters, without epics on the sprint board', async () => {
    const c = client();
    const board = await c.listIssuesForBoard(1);
    expect(board.issues.map((i) => i.key)).toEqual(['DEMO-2', 'DEMO-1']);
    expect(requests.find((r) => r.url === '/tasks')?.params).toMatchObject({ board_id: 1, limit: 200, offset: 0 });

    requests = [];
    const sprintTasks = await c.getTasksInSprintWithParents(7);
    expect(sprintTasks.map((i) => i.key)).toEqual(['DEMO-2']);
    expect(requests.find((r) => r.url === '/tasks')?.params).toMatchObject({ sprint_id: 7 });

    requests = [];
    await c.listIssuesUpdatedInRange(new Date('2026-11-20T00:00:00Z'), new Date('2026-11-22T00:00:00Z'), {
      queueKeys: ['demo'],
    });
    expect(requests.find((r) => r.url === '/tasks')?.params).toMatchObject({
      sort: 'updated_asc',
      updated_since: '2026-11-20T00:00:00.000Z',
      updated_until: '2026-11-22T00:00:00.000Z',
    });
  });

  it('builds board columns, statuses and sprints in contract shapes', async () => {
    const c = client();
    const board = await c.getBoard(1);
    expect(board).toMatchObject({
      columns: [
        { display: 'Беклог', id: 'беклог', statusKeys: ['беклог'] },
        { display: 'Готово к работе', id: 'готово к работе', statusKeys: ['готово к работе'] },
        { display: 'В работе', id: 'в работе', statusKeys: ['в работе'] },
        { display: 'Закрыта', id: 'закрыта', statusKeys: ['закрыта'] },
      ],
      id: 1,
      name: 'Team',
    });
    expect(await c.listStatuses()).toEqual([
      { id: 's-backlog', key: 'беклог', statusType: { key: 'new' } },
      // Not the first status, yet still waiting: the category decides, not the flags.
      { id: 's-ready', key: 'готово к работе', statusType: { key: 'new' } },
      { id: 's-work', key: 'в работе', statusType: { key: 'inProgress' } },
      { id: 's-closed', key: 'закрыта', statusType: { key: 'done' } },
    ]);
    const [sprint] = await c.listSprints(1);
    expect(sprint).toMatchObject({
      archived: false,
      board: { display: 'Team', id: '1' },
      createdBy: { display: 'Ada Admin', id: 'p-ada' },
      endDate: '2026-12-04',
      id: 7,
      startDate: '2026-11-23',
      status: 'in_progress',
      version: 3,
    });
  });

  it('exposes transitions, links and the journal as changelog', async () => {
    const c = client();
    expect(await c.getIssueTransitions('DEMO-2')).toEqual([
      { display: 'Закрыта', id: 's-closed', to: { display: 'Закрыта', id: 's-closed', key: 'закрыта', statusTypeKey: 'done' } },
    ]);
    expect(await c.listIssueLinks('DEMO-2')).toEqual([
      { direction: 'outward', id: 'l-1', linkedIssueKey: 'DEMO-1', linkedStatus: null, linkedSummary: 'Epic', relationship: 'relates' },
    ]);
    const changelog = await c.getIssueChangelogWithComments('demo-2');
    expect(changelog.comments).toEqual([]);
    expect(changelog.changelog[0]).toMatchObject({
      createdBy: { display: 'Ada Admin', id: 'p-ada' },
      fields: [
        { field: { id: 'status' }, from: { key: 'беклог' }, to: { display: 'В работе', key: 'в работе' } },
        { field: { id: 'storyPoints' }, from: { key: '2' }, to: { key: '3' } },
        { field: { id: 'sprint' }, from: [], to: [{ display: 'S7', id: '7' }] },
      ],
      id: '11',
      updatedAt: '2026-11-21T10:00:00Z',
    });
  });

  it('builds burndown issues from the journal like the other trackers', async () => {
    const c = client();
    const issue = (await c.getIssue('DEMO-2'))!;
    const [burndown] = await c.getBurndownIssuesForKeys(['DEMO-2'], { sprintId: '7', sprintName: 'S7' }, new Map([['DEMO-2', issue]]));
    expect(burndown).toMatchObject({ inCurrentSprint: true, issueKey: 'DEMO-2', statusKey: 'в работе', storyPoints: 3, testPoints: 1 });
    const fields = burndown!.rawChangelog[0]!.fields!.map((f) => f.field.id);
    expect(fields).toEqual(['status', 'storyPoints', 'sprint']);
    expect(await c.getBurndownIssuesForKeys([], undefined, new Map())).toEqual([]);
  });

  it('rejects what the built-in tracker does not have (comments)', async () => {
    await expect(client().addIssueComment('DEMO-2', 'hi')).rejects.toMatchObject({
      operation: 'addIssueComment',
      providerKind: 'otorva',
      status: 422,
    });
  });
});

describe('otorva provider client (write)', () => {
  beforeEach(() => {
    requests = [];
    const create = axios.create.bind(axios);
    vi.spyOn(axios, 'create').mockImplementation((config) => create({ ...config, adapter }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const writes = () =>
    requests
      .filter((r) => r.method !== 'get')
      .map((r) => [r.method, r.url, typeof r.data === 'string' ? JSON.parse(r.data) : r.data]);

  it('maps a planner patch to PUT /tasks/{id}: dates to YYYY-MM-DD, empty assignee clears, parent by key', async () => {
    await client().updateIssue('DEMO-2', {
      assigneeId: '',
      deadline: '2026-11-28T12:00:00Z',
      parent: 'DEMO-1',
      start: null,
      storyPoints: 5,
      summary: 'Renamed',
    });
    expect(writes()).toEqual([
      ['put', '/tasks/t-child', { assignee_id: null, end_date: '2026-11-28', parent_id: 't-epic', start_date: null, story_points: 5, title: 'Renamed' }],
    ]);
  });

  it('transitions by the target status id; moving to a sprint replaces sprints of the same board only', async () => {
    const c = client();
    await c.transitionIssue('DEMO-2', 's-closed', {});
    expect(writes()).toEqual([['post', '/tasks/t-child/transition', { to_status_id: 's-closed' }]]);

    requests = [];
    expect(await c.addIssueToSprint('DEMO-2', 7)).toEqual({ affectedSprintIds: [], backlogBoardIds: [] });
    expect(writes()).toEqual([]);
    // S8 — на другой доске: S7 остаётся.
    expect(await c.addIssueToSprint('DEMO-2', 8)).toEqual({ affectedSprintIds: [7, 8], backlogBoardIds: [1, 2] });
    expect(writes()).toEqual([['put', '/tasks/t-child/sprints', { sprint_ids: [7, 8] }]]);
    // S9 — на той же доске, что S7: перенос, S7 снимается (как «Перенести в спринт» у Яндекса).
    requests = [];
    expect(await c.addIssueToSprint('DEMO-2', 9)).toEqual({ affectedSprintIds: [7, 9], backlogBoardIds: [1] });
    expect(writes()).toEqual([['put', '/tasks/t-child/sprints', { sprint_ids: [9] }]]);
  });

  it('has no transition screens: the planner opens no transition form', async () => {
    await expect(client().getQueueWorkflowScreens('DEMO')).resolves.toEqual({});
    expect(requests).toEqual([]);
  });

  it('creates issues in a queue with type and sprint, and only relates links', async () => {
    const c = client();
    await expect(c.createIssue({ queue: 'demo', sprint: 7, summary: 'New', type: 'epic' })).resolves.toEqual({ id: 'written', key: 'DEMO-9' });
    expect(writes()).toEqual([
      ['post', '/tasks', { assignee_id: null, description: '', parent_id: null, queue_id: 'q-demo', task_type_id: 'tt-epic', title: 'New' }],
      ['post', '/sprints/7/tasks', { task_id: 'written' }],
    ]);
    await expect(c.createIssueLink('DEMO-2', { relationship: 'blocks', targetIssueKey: 'DEMO-1' })).rejects.toMatchObject({ status: 422 });
  });
});
