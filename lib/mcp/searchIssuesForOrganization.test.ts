import { describe, expect, it, vi } from 'vitest';

import { searchIssuesForOrganization } from './searchIssuesForOrganization';

describe('searchIssuesForOrganization', () => {
  it('filters bugs not in a sprint and returns compact hits', async () => {
    const issueTracker = {
      listIssueLinksBatch: vi.fn().mockResolvedValue({
        'RND-1': [{ linkedIssueKey: 'SUP-9' }],
      }),
      listIssuesForBoard: vi.fn().mockResolvedValue({
        issues: [
          {
            createdAt: '2026-01-01T00:00:00.000Z',
            description: 'Customers cannot login after OAuth. '.repeat(20),
            key: 'RND-1',
            priority: { display: 'Critical', key: 'critical' },
            provider: 'jira',
            status: { display: 'Open', key: 'open' },
            statusType: { key: 'new' },
            summary: 'OAuth login broken',
            type: { display: 'Bug', key: 'bug' },
          },
          {
            key: 'RND-2',
            provider: 'jira',
            sprint: { display: 'Sprint 34', id: '1221' },
            status: { key: 'open' },
            statusType: { key: 'new' },
            summary: 'In sprint bug',
            type: { display: 'Bug', key: 'bug' },
          },
          {
            key: 'RND-3',
            provider: 'jira',
            status: { key: 'open' },
            statusType: { key: 'new' },
            summary: 'Story',
            type: { display: 'Story', key: 'story' },
          },
        ],
        truncated: false,
      }),
      searchIssuesOnBoard: vi.fn(),
    };

    const result = await searchIssuesForOrganization({
      filters: {
        boardId: 113,
        issueType: 'bug',
        notInActiveSprint: true,
      },
      issueTracker: issueTracker as never,
    });

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0]?.key).toBe('RND-1');
    expect(result.hits[0]?.linkKeys).toEqual(['SUP-9']);
    expect(result.hits[0]?.statusCategory).toBe('todo');
    expect(result.hits[0]?.descriptionPreview?.endsWith('…')).toBe(true);
    expect(issueTracker.searchIssuesOnBoard).not.toHaveBeenCalled();
  });

  it('treats Ready for development as todo when filtering statusType=inProgress', async () => {
    const issueTracker = {
      listIssueLinksBatch: vi.fn().mockResolvedValue({}),
      listIssuesForBoard: vi.fn().mockResolvedValue({
        issues: [
          {
            key: 'RND-10',
            provider: 'jira',
            status: { display: 'Ready for development', key: 'readyfordevelopment' },
            statusType: { key: 'inProgress' },
            summary: 'Not started',
            type: { display: 'Task', key: 'task' },
          },
          {
            key: 'RND-11',
            provider: 'jira',
            status: { display: 'In Progress', key: 'inprogress' },
            statusType: { key: 'inProgress' },
            summary: 'Active',
            type: { display: 'Task', key: 'task' },
          },
        ],
        truncated: false,
      }),
      searchIssuesOnBoard: vi.fn(),
    };

    const inProgress = await searchIssuesForOrganization({
      filters: { boardId: 1, statusType: 'inProgress' },
      issueTracker: issueTracker as never,
    });
    expect(inProgress.hits.map((hit) => hit.key)).toEqual(['RND-11']);

    const todo = await searchIssuesForOrganization({
      filters: { boardId: 1, statusType: 'todo' },
      issueTracker: issueTracker as never,
    });
    expect(todo.hits.map((hit) => hit.key)).toEqual(['RND-10']);
  });
});
