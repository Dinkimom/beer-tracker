import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildJiraCreateIssueFields,
  createJiraIssue,
  pickJiraCreateIssueType,
} from './jiraIssueCreate';
import { addJiraIssueToSprint } from './jiraIssueSprintMembership';

vi.mock('./jiraQueues', () => ({
  fetchJiraQueueWorkflows: vi.fn((_api: unknown, queueKey: string) =>
    Promise.resolve({
      [queueKey]: [{ display: 'Задача', id: '173', key: 'задача' }],
    })
  ),
}));

vi.mock('./jiraIssueSprintMembership', () => ({
  addJiraIssueToSprint: vi.fn(() =>
    Promise.resolve({ affectedSprintIds: [78804], backlogBoardIds: [15116] })
  ),
}));

function apiWith(post: ReturnType<typeof vi.fn>) {
  return { post } as never;
}

describe('pickJiraCreateIssueType', () => {
  const types = [
    { display: 'Задача', id: '173', key: 'задача' },
    { display: 'Bug', id: '101', key: 'bug' },
  ];

  it('matches Yandex task key to localized Jira type', () => {
    expect(pickJiraCreateIssueType(types, 'task')).toEqual({ id: '173' });
  });

  it('uses a numeric type id as-is', () => {
    expect(pickJiraCreateIssueType(types, '101')).toEqual({ id: '101' });
  });

  it('falls back to the first project type', () => {
    expect(pickJiraCreateIssueType(types)).toEqual({ id: '173' });
  });

  it('falls back to Task name when the project has no types', () => {
    expect(pickJiraCreateIssueType([], 'story')).toEqual({ name: 'story' });
    expect(pickJiraCreateIssueType([])).toEqual({ name: 'Task' });
  });
});

describe('buildJiraCreateIssueFields', () => {
  const types = [{ display: 'Задача', id: '173', key: 'задача' }];

  it('maps queue, summary, parent and assignee name', () => {
    expect(
      buildJiraCreateIssueFields(
        {
          assignee: 'jdoe',
          parent: 'PROJ-1',
          queue: 'PROJ',
          summary: 'New task',
          type: 'task',
        },
        types
      )
    ).toEqual({
      assignee: { name: 'jdoe' },
      issuetype: { id: '173' },
      parent: { key: 'PROJ-1' },
      project: { key: 'PROJ' },
      summary: 'New task',
    });
  });

  it('skips staff swimlane assignee ids', () => {
    const fields = buildJiraCreateIssueFields(
      {
        assignee: 'staff:11111111-1111-4111-8111-111111111111',
        queue: 'PROJ',
        summary: 'Staff lane',
      },
      types
    );
    expect(fields.assignee).toBeUndefined();
  });
});

describe('createJiraIssue', () => {
  beforeEach(() => {
    vi.mocked(addJiraIssueToSprint).mockClear();
  });

  it('posts fields and adds the issue to the sprint', async () => {
    const post = vi.fn().mockResolvedValue({
      data: { id: '10050', key: 'PROJ-50', self: 'https://jira.example.com/rest/api/2/issue/10050' },
    });
    await expect(
      createJiraIssue(apiWith(post), {
        queue: 'PROJ',
        sprint: 78804,
        summary: 'Created from planner',
        type: 'task',
      })
    ).resolves.toEqual({
      id: '10050',
      key: 'PROJ-50',
      self: 'https://jira.example.com/rest/api/2/issue/10050',
    });
    expect(post).toHaveBeenCalledWith('/issue', {
      fields: {
        issuetype: { id: '173' },
        project: { key: 'PROJ' },
        summary: 'Created from planner',
      },
    });
    expect(addJiraIssueToSprint).toHaveBeenCalledWith(expect.anything(), 'PROJ-50', 78804);
  });

  it('skips sprint membership when sprint is omitted', async () => {
    const post = vi.fn().mockResolvedValue({ data: { key: 'PROJ-51' } });
    await createJiraIssue(apiWith(post), { queue: 'PROJ', summary: 'No sprint' });
    expect(addJiraIssueToSprint).not.toHaveBeenCalled();
  });

  it('rejects missing project or summary', async () => {
    const post = vi.fn();
    await expect(createJiraIssue(apiWith(post), { queue: '  ', summary: 'X' })).rejects.toThrow(
      'Jira createIssue requires project key and summary'
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects a create response without a key', async () => {
    const post = vi.fn().mockResolvedValue({ data: {} });
    await expect(createJiraIssue(apiWith(post), { queue: 'PROJ', summary: 'X' })).rejects.toThrow(
      'Jira createIssue returned no issue key'
    );
  });
});
