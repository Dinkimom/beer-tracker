import { describe, expect, it, vi } from 'vitest';

import { listJiraIssuesForBoard, listJiraIssuesForQueue, listJiraIssuesUpdatedInRange } from './jiraIssueList';

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

describe('listJiraIssuesUpdatedInRange', () => {
  it('searches JQL updated window and maps issues', async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        issues: [{ fields: { summary: 'Updated' }, key: 'PROJ-3' }],
        isLast: true,
        total: 1,
      },
    });
    const result = await listJiraIssuesUpdatedInRange(
      apiWith({ post }),
      new Date('2026-03-01T10:00:00.000Z'),
      new Date('2026-03-10T12:00:00.000Z'),
      { maxIssues: 50, perPage: 50 }
    );
    expect(post).toHaveBeenCalledWith('/search', {
      fields: ['*all'],
      jql: 'updated >= "2026-03-01 10:00" AND updated <= "2026-03-10 12:00" ORDER BY updated ASC',
      maxResults: 50,
      startAt: 0,
    });
    expect(result).toEqual({
      issues: [expect.objectContaining({ key: 'PROJ-3', summary: 'Updated' })],
      truncated: false,
    });
  });

  it('returns truncated empty when maxIssues is 0', async () => {
    const post = vi.fn();
    await expect(
      listJiraIssuesUpdatedInRange(
        apiWith({ post }),
        new Date('2026-03-01T10:00:00.000Z'),
        new Date('2026-03-10T12:00:00.000Z'),
        { maxIssues: 0 }
      )
    ).resolves.toEqual({ issues: [], truncated: true });
    expect(post).not.toHaveBeenCalled();
  });
});

describe('listJiraIssuesForBoard', () => {
  it('loads Agile board issues with pagination checkpoint', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        issues: [{ fields: { summary: 'On board' }, key: 'PROJ-4' }],
        isLast: true,
        total: 1,
      },
    });
    const onCheckpoint = vi.fn();
    const result = await listJiraIssuesForBoard(apiWith({ get }), 15116, {
      onCheckpoint,
      perPage: 50,
    });
    expect(get).toHaveBeenCalledWith('https://jira.example.com/rest/agile/1.0/board/15116/issue', {
      params: { fields: '*all', maxResults: 50, startAt: 0 },
    });
    expect(onCheckpoint).toHaveBeenCalledWith({
      boardId: 15116,
      page: 1,
      totalIssues: 1,
      totalPages: 1,
    });
    expect(result.issues).toEqual([
      expect.objectContaining({ key: 'PROJ-4', summary: 'On board' }),
    ]);
    expect(result.truncated).toBe(false);
  });

  it('falls back to JQL when Agile fails', async () => {
    const get = vi
      .fn()
      .mockRejectedValueOnce(new Error('no agile'))
      .mockResolvedValueOnce({ data: { location: { projectKey: 'BOOK' } } });
    const post = vi.fn().mockResolvedValue({
      data: {
        issues: [{ fields: { summary: 'From JQL' }, key: 'PROJ-9' }],
        isLast: true,
        total: 1,
      },
    });
    const result = await listJiraIssuesForBoard(apiWith({ get, post }), 15116, { perPage: 50 });
    expect(post).toHaveBeenCalledWith('/search', {
      fields: ['*all'],
      jql: 'project = "BOOK"',
      maxResults: 50,
      startAt: 0,
    });
    expect(result.issues).toEqual([
      expect.objectContaining({ key: 'PROJ-9', summary: 'From JQL' }),
    ]);
  });
});

describe('listJiraIssuesForQueue', () => {
  it('searches JQL project scope with pagination checkpoint', async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        issues: [{ fields: { summary: 'In queue' }, key: 'ST-4' }],
        isLast: true,
        total: 1,
      },
    });
    const onCheckpoint = vi.fn();
    const result = await listJiraIssuesForQueue(apiWith({ post }), 'ST', {
      onCheckpoint,
      perPage: 50,
    });
    expect(post).toHaveBeenCalledWith('/search', {
      fields: ['*all'],
      jql: 'project = "ST"',
      maxResults: 50,
      startAt: 0,
    });
    expect(onCheckpoint).toHaveBeenCalledWith({
      page: 1,
      queueKey: 'ST',
      totalIssues: 1,
      totalPages: 1,
    });
    expect(result.issues).toEqual([
      expect.objectContaining({ key: 'ST-4', summary: 'In queue' }),
    ]);
    expect(result.truncated).toBe(false);
  });

  it('pages Jira Cloud search with nextPageToken and a stable page total', async () => {
    let searchPages = 0;
    const post = vi.fn().mockImplementation((url: string) => {
      if (url === '/search/approximate-count') {
        return Promise.resolve({ data: { count: 2 } });
      }
      searchPages += 1;
      if (searchPages === 1) {
        return Promise.resolve({
          data: {
            isLast: false,
            issues: [{ fields: { summary: 'First' }, key: 'RND-1' }],
            nextPageToken: 'page-2',
          },
        });
      }
      return Promise.resolve({
        data: {
          isLast: true,
          issues: [{ fields: { summary: 'Second' }, key: 'RND-2' }],
        },
      });
    });
    const onCheckpoint = vi.fn();
    const result = await listJiraIssuesForQueue(
      {
        defaults: { baseURL: 'https://example.atlassian.net/rest/api/3' },
        get: vi.fn(),
        post,
      } as never,
      'RND',
      { onCheckpoint, perPage: 1 }
    );
    expect(post).toHaveBeenCalledWith('/search/approximate-count', { jql: 'project = "RND"' });
    expect(post).toHaveBeenCalledWith('/search/jql', {
      fields: ['*all'],
      jql: 'project = "RND"',
      maxResults: 1,
    });
    expect(post).toHaveBeenCalledWith('/search/jql', {
      fields: ['*all'],
      jql: 'project = "RND"',
      maxResults: 1,
      nextPageToken: 'page-2',
    });
    expect(onCheckpoint).toHaveBeenNthCalledWith(1, {
      page: 1,
      queueKey: 'RND',
      totalIssues: 1,
      totalPages: 2,
    });
    expect(onCheckpoint).toHaveBeenNthCalledWith(2, {
      page: 2,
      queueKey: 'RND',
      totalIssues: 2,
      totalPages: 2,
    });
    expect(result.issues.map((issue) => issue.key)).toEqual(['RND-1', 'RND-2']);
    expect(result.truncated).toBe(false);
  });
});
