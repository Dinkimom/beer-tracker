import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiCache } from '@/lib/cache';

import { loadJiraSprintIssues } from './jiraSprintIssueLoad';

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

    const agileCalls = get.mock.calls.filter((call) => String(call[0]).includes('/sprint/'));
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

    const agileCalls = get.mock.calls.filter((call) => String(call[0]).includes('/sprint/'));
    expect(agileCalls).toHaveLength(1);
    expect(second).toEqual(first);
  });
});
