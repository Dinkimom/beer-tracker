import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiCache } from '@/lib/cache';

import { loadJiraSprintIssues, searchJiraIssuesInSprint } from './jiraSprintIssueLoad';

const SPRINT_ID = 99101;
const API_BASE = 'https://jira-sprint-load.example/rest/api/2';

function sprintPage() {
  return {
    data: {
      isLast: true,
      issues: [
        {
          fields: {
            issuelinks: [
              {
                id: '10',
                outwardIssue: { key: 'MQA-1' },
                type: { inward: 'is QA for', name: 'QA', outward: 'has linked QA task' },
              },
            ],
            status: { statusCategory: { key: 'new' } },
            summary: 'Fix login',
          },
          key: 'PROJ-1',
        },
      ],
      total: 1,
    },
  };
}

function jiraApi(methods: { get?: ReturnType<typeof vi.fn>; post?: ReturnType<typeof vi.fn> }) {
  return {
    defaults: { baseURL: API_BASE },
    get: methods.get ?? vi.fn(),
    post: methods.post ?? vi.fn(),
  } as never;
}

describe('loadJiraSprintIssues', () => {
  beforeEach(() => {
    apiCache.deleteByPattern(/^jira:sprint-issues:99101:/);
  });

  it('searches Jira once and reuses the result, including harvested links', async () => {
    const get = vi.fn((url: string) => {
      if (String(url).endsWith('/field')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve(sprintPage());
    });
    const api = { defaults: { baseURL: API_BASE }, get, post: vi.fn() } as never;

    const first = await loadJiraSprintIssues(api, SPRINT_ID);
    const second = await loadJiraSprintIssues(api, SPRINT_ID);

    const agileCalls = get.mock.calls.filter((call) => String(call[0]).endsWith('/issue'));
    expect(agileCalls).toHaveLength(1);
    expect(second).toBe(first);
    expect(first[0]?.issueLinks).toEqual([
      expect.objectContaining({ id: '10', linkedIssueKey: 'MQA-1' }),
    ]);
  });

  it('shares one search across concurrent callers', async () => {
    let release: (value: unknown) => void = () => {};
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const get = vi.fn((url: string) => {
      if (String(url).endsWith('/field')) {
        return Promise.resolve({ data: [] });
      }
      return gate.then(() => sprintPage());
    });
    const api = { defaults: { baseURL: API_BASE }, get, post: vi.fn() } as never;

    const pending = Promise.all([
      loadJiraSprintIssues(api, SPRINT_ID),
      loadJiraSprintIssues(api, SPRINT_ID),
    ]);
    release(undefined);
    const [first, second] = await pending;

    const agileCalls = get.mock.calls.filter((call) => String(call[0]).endsWith('/issue'));
    expect(agileCalls).toHaveLength(1);
    expect(second).toEqual(first);
  });
});

describe('searchJiraIssuesInSprint', () => {
  it('loads Agile sprint issues', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        isLast: true,
        issues: [
          {
            fields: { summary: 'Fix login', status: { statusCategory: { key: 'new' } } },
            key: 'PROJ-1',
          },
        ],
        total: 1,
      },
    });
    const issues = await searchJiraIssuesInSprint(jiraApi({ get }), 78804);
    expect(get).toHaveBeenCalledWith('https://jira-sprint-load.example/rest/agile/1.0/sprint/78804/issue', {
      params: { fields: '*all', maxResults: 50, startAt: 0 },
    });
    expect(issues).toEqual([expect.objectContaining({ key: 'PROJ-1', summary: 'Fix login' })]);
  });

  it('loads sprint issues through the board so its filter applies', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        isLast: true,
        issues: [{ fields: { summary: 'Team A' }, key: 'PROJ-2' }],
        total: 1,
      },
    });
    const issues = await searchJiraIssuesInSprint(jiraApi({ get }), 78804, 12);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(
      'https://jira-sprint-load.example/rest/agile/1.0/board/12/sprint/78804/issue',
      { params: { fields: '*all', maxResults: 50, startAt: 0 } }
    );
    expect(issues).toEqual([expect.objectContaining({ key: 'PROJ-2' })]);
  });

  it('falls back to the sprint endpoint when the board request fails', async () => {
    const get = vi.fn((url: string) =>
      url.includes('/board/')
        ? Promise.reject(new Error('board gone'))
        : Promise.resolve({
            data: { isLast: true, issues: [{ fields: { summary: 'Any' }, key: 'PROJ-3' }], total: 1 },
          })
    );
    const issues = await searchJiraIssuesInSprint(jiraApi({ get }), 78804, 12);
    expect(get).toHaveBeenLastCalledWith(
      'https://jira-sprint-load.example/rest/agile/1.0/sprint/78804/issue',
      expect.anything()
    );
    expect(issues).toEqual([expect.objectContaining({ key: 'PROJ-3' })]);
  });

  it('falls back to JQL search when Agile fails', async () => {
    const get = vi.fn().mockRejectedValue(new Error('no agile'));
    const post = vi.fn().mockResolvedValue({
      data: {
        issues: [{ fields: { summary: 'From JQL' }, key: 'PROJ-9' }],
        total: 1,
      },
    });
    const issues = await searchJiraIssuesInSprint(jiraApi({ get, post }), 78804);
    expect(post).toHaveBeenCalledWith('/search', {
      fields: ['*all'],
      jql: 'sprint = 78804 ORDER BY Rank ASC',
      maxResults: 50,
      startAt: 0,
    });
    expect(issues).toEqual([expect.objectContaining({ key: 'PROJ-9', summary: 'From JQL' })]);
  });
});
