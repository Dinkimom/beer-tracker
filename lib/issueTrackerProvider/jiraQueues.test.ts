import { describe, expect, it, vi } from 'vitest';

import {
  extractJiraProjectIssueTypeRows,
  fetchJiraQueueByKey,
  fetchJiraQueueWorkflows,
  mapJiraProjectIssueType,
  searchJiraQueues,
} from './jiraQueues';

function apiWith(methods: { get?: ReturnType<typeof vi.fn> }) {
  return {
    get: methods.get ?? vi.fn(),
  } as never;
}

describe('mapJiraProjectIssueType', () => {
  it('maps Jira issue type names to tracker keys', () => {
    expect(mapJiraProjectIssueType({ id: '10001', name: 'Task' })).toEqual({
      display: 'Task',
      id: '10001',
      key: 'task',
    });
  });

  it('skips sub-task types', () => {
    expect(mapJiraProjectIssueType({ id: '10002', name: 'Sub-task', subtask: true })).toBeNull();
  });
});

describe('fetchJiraQueueByKey', () => {
  it('GETs /project/{key} and maps queue metadata', async () => {
    const get = vi.fn().mockResolvedValue({
      data: { id: '10100', key: 'PROJ', name: 'Booking' },
    });
    await expect(fetchJiraQueueByKey(apiWith({ get }), 'PROJ')).resolves.toEqual({
      id: 10100,
      key: 'PROJ',
      name: 'Booking',
    });
    expect(get).toHaveBeenCalledWith('/project/PROJ');
  });
});

describe('searchJiraQueues', () => {
  it('filters projects by key or name and returns empty for a blank query', async () => {
    const get = vi.fn().mockResolvedValue({
      data: [
        { key: 'PROJ', name: 'Booking' },
        { key: 'OPS', name: 'Operations' },
      ],
    });
    await expect(searchJiraQueues(apiWith({ get }), 'book')).resolves.toEqual([
      { key: 'PROJ', name: 'Booking' },
    ]);
    await expect(searchJiraQueues(apiWith({ get }), '  ')).resolves.toEqual([]);
  });
});

describe('fetchJiraQueueWorkflows', () => {
  it('reads issue types from /project/{key}/statuses', async () => {
    const get = vi.fn().mockResolvedValue({
      data: [
        { id: '1', name: 'Task' },
        { id: '2', name: 'Bug' },
        { id: '3', name: 'Sub-task', subtask: true },
      ],
    });
    await expect(fetchJiraQueueWorkflows(apiWith({ get }), 'PROJ')).resolves.toEqual({
      PROJ: [
        { display: 'Task', id: '1', key: 'task' },
        { display: 'Bug', id: '2', key: 'bug' },
      ],
    });
    expect(get).toHaveBeenCalledWith('/project/PROJ/statuses');
  });

  it('falls back to createmeta when statuses endpoint fails', async () => {
    const get = vi
      .fn()
      .mockRejectedValueOnce(new Error('no statuses'))
      .mockResolvedValueOnce({
        data: {
          projects: [{ issuetypes: [{ id: '9', name: 'Story' }] }],
        },
      });
    await expect(fetchJiraQueueWorkflows(apiWith({ get }), 'PROJ')).resolves.toEqual({
      PROJ: [{ display: 'Story', id: '9', key: 'story' }],
    });
    expect(get).toHaveBeenNthCalledWith(2, '/issue/createmeta', {
      params: { expand: 'projects.issuetypes', projectKeys: 'PROJ' },
    });
  });

  it('extractJiraProjectIssueTypeRows accepts arrays only', () => {
    expect(extractJiraProjectIssueTypeRows([{ name: 'Task' }])).toEqual([{ name: 'Task' }]);
    expect(extractJiraProjectIssueTypeRows({})).toEqual([]);
  });
});
