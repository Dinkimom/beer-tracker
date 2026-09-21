import { describe, expect, it, vi } from 'vitest';

import {
  addJiraIssueToSprint,
  currentJiraSprintIdsFromIssue,
  removeJiraIssueFromSprint,
  replaceJiraIssueSprints,
} from './jiraIssueSprintMembership';

vi.mock('./jiraIssues', () => ({
  fetchJiraIssue: vi.fn(),
}));

import { fetchJiraIssue } from './jiraIssues';

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

describe('currentJiraSprintIdsFromIssue', () => {
  it('reads sprint ids from issue payload', () => {
    expect(
      currentJiraSprintIdsFromIssue({
        id: '1',
        key: 'PROJ-1',
        provider: 'jira',
        sprint: [{ display: 'Sprint 1', id: '78804' }],
        summary: 'Task',
      })
    ).toEqual([78804]);
  });
});

describe('addJiraIssueToSprint', () => {
  it('POSTs issue to Agile sprint and returns affected board', async () => {
    vi.mocked(fetchJiraIssue).mockResolvedValueOnce({
      id: '1',
      key: 'PROJ-1',
      provider: 'jira',
      sprint: [{ display: 'Old', id: '78803' }],
      summary: 'Task',
    });
    const get = vi.fn().mockResolvedValueOnce({ data: { originBoardId: 15116 } });
    const post = vi.fn().mockResolvedValue({ data: {} });

    await expect(addJiraIssueToSprint(apiWith({ get, post }), 'PROJ-1', 78804)).resolves.toEqual({
      affectedSprintIds: [78803, 78804],
      backlogBoardIds: [15116],
    });

    expect(post).toHaveBeenCalledWith(
      'https://jira.example.com/rest/agile/1.0/sprint/78804/issue',
      { issues: ['PROJ-1'] }
    );
  });

  it('is a no-op when issue is already in the sprint', async () => {
    vi.mocked(fetchJiraIssue).mockResolvedValueOnce({
      id: '1',
      key: 'PROJ-1',
      provider: 'jira',
      sprint: [{ display: 'Sprint', id: '78804' }],
      summary: 'Task',
    });
    const post = vi.fn();

    await expect(addJiraIssueToSprint(apiWith({ post }), 'PROJ-1', 78804)).resolves.toEqual({
      affectedSprintIds: [],
      backlogBoardIds: [],
    });
    expect(post).not.toHaveBeenCalled();
  });
});

describe('removeJiraIssueFromSprint', () => {
  it('POSTs issue to Agile backlog', async () => {
    vi.mocked(fetchJiraIssue).mockResolvedValueOnce({
      id: '1',
      key: 'PROJ-1',
      provider: 'jira',
      sprint: [{ display: 'Sprint', id: '78804' }],
      summary: 'Task',
    });
    const get = vi.fn().mockResolvedValueOnce({ data: { originBoardId: 15116 } });
    const post = vi.fn().mockResolvedValue({ data: {} });

    await expect(removeJiraIssueFromSprint(apiWith({ get, post }), 'PROJ-1', '78804')).resolves.toEqual({
      affectedSprintIds: [78804],
      backlogBoardIds: [15116],
    });
    expect(post).toHaveBeenCalledWith('https://jira.example.com/rest/agile/1.0/backlog/issue', {
      issues: ['PROJ-1'],
    });
  });
});

describe('replaceJiraIssueSprints', () => {
  it('moves issue to the target sprint', async () => {
    vi.mocked(fetchJiraIssue).mockResolvedValueOnce({
      id: '1',
      key: 'PROJ-1',
      provider: 'jira',
      sprint: [{ display: 'Old', id: '78803' }],
      summary: 'Task',
    });
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: { originBoardId: 15116 } })
      .mockResolvedValueOnce({ data: { originBoardId: 15116 } });
    const post = vi.fn().mockResolvedValue({ data: {} });

    await expect(
      replaceJiraIssueSprints(apiWith({ get, post }), 'PROJ-1', [{ id: '78804' }])
    ).resolves.toEqual({
      affectedSprintIds: [78803, 78804],
      backlogBoardIds: [15116],
    });
    expect(post).toHaveBeenCalledWith(
      'https://jira.example.com/rest/agile/1.0/sprint/78804/issue',
      { issues: ['PROJ-1'] }
    );
  });

  it('moves issue to backlog when sprint list is empty', async () => {
    vi.mocked(fetchJiraIssue).mockResolvedValueOnce({
      id: '1',
      key: 'PROJ-1',
      provider: 'jira',
      sprint: [{ display: 'Old', id: '78803' }],
      summary: 'Task',
    });
    const get = vi.fn().mockResolvedValueOnce({ data: { originBoardId: 15116 } });
    const post = vi.fn().mockResolvedValue({ data: {} });

    await expect(replaceJiraIssueSprints(apiWith({ get, post }), 'PROJ-1', [])).resolves.toEqual({
      affectedSprintIds: [78803],
      backlogBoardIds: [15116],
    });
    expect(post).toHaveBeenCalledWith('https://jira.example.com/rest/agile/1.0/backlog/issue', {
      issues: ['PROJ-1'],
    });
  });
});
