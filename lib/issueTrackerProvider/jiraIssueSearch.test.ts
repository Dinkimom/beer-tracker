import { describe, expect, it, vi } from 'vitest';

import {
  isJiraEpicIssueTypeKey,
  pickJiraEpicIssueTypeIds,
  searchJiraIssuesOnBoard,
} from './jiraIssueSearch';

const API_BASE = 'https://jira.example.com/rest/api/2';

function apiWith(methods: {
  get?: ReturnType<typeof vi.fn>;
  post?: ReturnType<typeof vi.fn>;
}) {
  return {
    defaults: { baseURL: API_BASE },
    get: methods.get ?? vi.fn(),
    post: methods.post ?? vi.fn(),
  } as never;
}

describe('searchJiraIssuesOnBoard', () => {
  it('loads Agile board issues with jql filter', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        isLast: true,
        issues: [
          {
            fields: { summary: 'Redesign checkout', status: { statusCategory: { key: 'new' } } },
            key: 'PROJ-42',
          },
        ],
        total: 1,
      },
    });
    const issues = await searchJiraIssuesOnBoard(apiWith({ get }), 15116, 'редиз');
    expect(get).toHaveBeenCalledWith('https://jira.example.com/rest/agile/1.0/board/15116/issue', {
      params: {
        fields: '*all',
        jql: 'summary ~ "редиз*"',
        maxResults: 20,
        startAt: 0,
      },
    });
    expect(issues).toEqual([
      expect.objectContaining({ key: 'PROJ-42', summary: 'Redesign checkout' }),
    ]);
  });

  it('falls back to JQL search when Agile fails', async () => {
    const get = vi
      .fn()
      .mockRejectedValueOnce(new Error('no agile'))
      .mockResolvedValueOnce({ data: { location: { projectKey: 'BOOK' } } });
    const post = vi.fn().mockResolvedValue({
      data: {
        issues: [{ fields: { summary: 'From JQL' }, key: 'PROJ-9' }],
      },
    });
    const issues = await searchJiraIssuesOnBoard(apiWith({ get, post }), 15116, 'тест');
    expect(post).toHaveBeenCalledWith('/search', {
      fields: ['*all'],
      jql: 'project = "BOOK" AND summary ~ "тест*"',
      maxResults: 20,
      startAt: 0,
    });
    expect(issues).toEqual([expect.objectContaining({ key: 'PROJ-9', summary: 'From JQL' })]);
  });

  it('returns empty array when JQL search responds with 400', async () => {
    const get = vi
      .fn()
      .mockRejectedValueOnce(new Error('no agile'))
      .mockResolvedValueOnce({ data: {} });
    const post = vi.fn().mockRejectedValue({ response: { status: 400 } });
    await expect(searchJiraIssuesOnBoard(apiWith({ get, post }), 15116, 'тест')).resolves.toEqual([]);
  });

  it('returns empty for blank query', async () => {
    const get = vi.fn();
    await expect(searchJiraIssuesOnBoard(apiWith({ get }), 15116, '  ')).resolves.toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });
});

describe('pickJiraEpicIssueTypeIds', () => {
  it('keeps Epic / Эпик and Cloud hierarchyLevel 1, skips sub-tasks', () => {
    expect(
      pickJiraEpicIssueTypeIds([
        { id: '1', name: 'Task', subtask: false },
        { id: '10000', name: 'Epic', subtask: false },
        { id: '5', name: 'Sub-task', subtask: true },
        { id: '7', name: 'Эпик', subtask: false },
        { id: '8', hierarchyLevel: 2, name: 'Initiative', subtask: false },
        { id: '9', hierarchyLevel: 1, name: 'Theme', subtask: false },
      ])
    ).toEqual(['10000', '7', '9']);
  });
});

describe('isJiraEpicIssueTypeKey', () => {
  it('matches normalized epic type keys', () => {
    expect(isJiraEpicIssueTypeKey('epic')).toBe(true);
    expect(isJiraEpicIssueTypeKey('Эпик')).toBe(true);
    expect(isJiraEpicIssueTypeKey('story')).toBe(false);
  });
});

describe('searchJiraIssuesOnBoard parent candidates', () => {
  it('restricts JQL to epic issue types and drops non-epics', async () => {
    const get = vi.fn((url: string) => {
      if (url === '/issuetype') {
        return {
          data: [
            { id: '1', name: 'Task', subtask: false },
            { id: '10000', name: 'Epic', subtask: false },
          ],
        };
      }
      return {
        data: {
          issues: [
            {
              fields: { issuetype: { name: 'Story' }, summary: 'Not a parent' },
              key: 'PROJ-26',
            },
            {
              fields: { issuetype: { name: 'Epic' }, summary: 'Real epic' },
              key: 'PROJ-10',
            },
          ],
        },
      };
    });
    const issues = await searchJiraIssuesOnBoard(apiWith({ get }), 15116, 'тест', {
      parentCandidates: true,
    });
    expect(get).toHaveBeenCalledWith('/issuetype');
    expect(get).toHaveBeenCalledWith('https://jira.example.com/rest/agile/1.0/board/15116/issue', {
      params: {
        fields: '*all',
        jql: 'summary ~ "тест*" AND issuetype in (10000)',
        maxResults: 20,
        startAt: 0,
      },
    });
    expect(issues).toEqual([expect.objectContaining({ key: 'PROJ-10', summary: 'Real epic' })]);
  });

  it('falls back to issuetype = Epic when the type catalog is empty', async () => {
    const get = vi.fn((url: string) => {
      if (url === '/issuetype') {
        return { data: [{ id: '1', name: 'Task', subtask: false }] };
      }
      return {
        data: {
          issues: [
            {
              fields: { issuetype: { name: 'Epic' }, summary: 'Fallback epic' },
              key: 'PROJ-11',
            },
          ],
        },
      };
    });
    await searchJiraIssuesOnBoard(apiWith({ get }), 15116, 'тест', { parentCandidates: true });
    expect(get).toHaveBeenCalledWith('https://jira.example.com/rest/agile/1.0/board/15116/issue', {
      params: {
        fields: '*all',
        jql: 'summary ~ "тест*" AND issuetype = Epic',
        maxResults: 20,
        startAt: 0,
      },
    });
  });
});
