import { describe, expect, it, vi } from 'vitest';

import {
  countJiraCloudIssues,
  postJiraIssueSearch,
  readJiraSearchNextPageToken,
} from './jiraIssueSearchRequest';

function apiWith(baseURL: string) {
  const post = vi.fn().mockResolvedValue({ data: { issues: [] } });
  return {
    api: { defaults: { baseURL }, post } as never,
    post,
  };
}

describe('postJiraIssueSearch', () => {
  it('uses offset search on Jira Server', async () => {
    const { api, post } = apiWith('https://jira.example.com/rest/api/2');
    await postJiraIssueSearch(api, {
      fields: ['*all'],
      jql: 'project = "RND"',
      maxResults: 50,
      startAt: 100,
    });
    expect(post).toHaveBeenCalledWith('/search', {
      fields: ['*all'],
      jql: 'project = "RND"',
      maxResults: 50,
      startAt: 100,
    });
  });

  it('uses enhanced search on Jira Cloud and forwards the page token', async () => {
    const { api, post } = apiWith('https://example.atlassian.net/rest/api/3');
    await postJiraIssueSearch(api, {
      fields: ['*all'],
      jql: 'project = "RND"',
      maxResults: 100,
      nextPageToken: 'page-2',
      startAt: 100,
    });
    expect(post).toHaveBeenCalledWith('/search/jql', {
      fields: ['*all'],
      jql: 'project = "RND"',
      maxResults: 100,
      nextPageToken: 'page-2',
    });
  });
});

describe('countJiraCloudIssues', () => {
  it('asks Cloud for an approximate count before paging', async () => {
    const { api, post } = apiWith('https://example.atlassian.net/rest/api/3');
    post.mockResolvedValueOnce({ data: { count: 250 } });
    await expect(countJiraCloudIssues(api, 'project = "RND"')).resolves.toBe(250);
    expect(post).toHaveBeenCalledWith('/search/approximate-count', { jql: 'project = "RND"' });
  });

  it('skips the count on Jira Server', async () => {
    const { api, post } = apiWith('https://jira.example.com/rest/api/2');
    await expect(countJiraCloudIssues(api, 'project = "RND"')).resolves.toBeNull();
    expect(post).not.toHaveBeenCalled();
  });
});

describe('readJiraSearchNextPageToken', () => {
  it('reads a non-empty token', () => {
    expect(readJiraSearchNextPageToken({ nextPageToken: ' page-2 ' })).toBe('page-2');
    expect(readJiraSearchNextPageToken({ nextPageToken: '  ' })).toBeUndefined();
    expect(readJiraSearchNextPageToken(null)).toBeUndefined();
  });
});
