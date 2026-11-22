import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createOtorvaProviderClient, OTORVA_DEFAULT_API_URL } from './otorvaProvider';

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
  '/tasks/t-epic': EPIC,
  '/workflows': [{ id: 'wf' }],
  '/workflows/wf': { statuses: Object.values(STATUS), task_type_id: 'tt-task' },
};

let requests: InternalAxiosRequestConfig[] = [];

const adapter: AxiosAdapter = (config) => {
  requests.push(config);
  const path = config.url ?? '';
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

  it('still rejects write operations until they are implemented', async () => {
    await expect(client().createSprint({ boardId: 1, endDate: '2026-12-04', name: 'S8', startDate: '2026-11-23' })).rejects.toMatchObject({
      operation: 'createSprint',
      providerKind: 'otorva',
      status: 422,
    });
  });
});
