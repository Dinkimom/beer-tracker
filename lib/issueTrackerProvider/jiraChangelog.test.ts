import { describe, expect, it, vi } from 'vitest';

import {
  extractJiraChangelogHistories,
  fetchJiraIssueChangelogWithComments,
  jiraChangelogLogsFromHistories,
  mapJiraChangelogHistoryToLog,
} from './jiraChangelog';

const API_BASE = 'https://jira.example.com/rest/api/2';

function apiWithGet(get: ReturnType<typeof vi.fn>) {
  return {
    defaults: { baseURL: API_BASE },
    get,
  } as never;
}

const statusHistory = {
  author: { displayName: 'Ada', name: 'ada' },
  created: '2026-03-10T12:00:00.000+0000',
  id: '10000',
  items: [
    {
      field: 'status',
      from: '1',
      fromString: 'Open',
      to: '6',
      toString: 'Closed',
    },
    { field: 'summary', fromString: 'Old', toString: 'New' },
  ],
};

describe('extractJiraChangelogHistories', () => {
  it('reads Cloud values, expand histories and nested changelog', () => {
    expect(extractJiraChangelogHistories({ values: [{ id: '1' }] })).toEqual([{ id: '1' }]);
    expect(extractJiraChangelogHistories({ changelog: { histories: [{ id: '2' }] } })).toEqual([
      { id: '2' },
    ]);
    expect(extractJiraChangelogHistories([])).toEqual([]);
  });
});

describe('mapJiraChangelogHistoryToLog', () => {
  it('keeps status/points fields in the Yandex-shaped log', () => {
    expect(mapJiraChangelogHistoryToLog(statusHistory)).toEqual({
      createdBy: { display: 'Ada', id: 'ada' },
      fields: [
        {
          field: { display: 'status', id: 'status' },
          from: { display: 'Open', id: '1', key: 'open' },
          to: { display: 'Closed', id: '6', key: 'closed' },
        },
      ],
      id: '10000',
      type: 'IssueUpdate',
      updatedAt: '2026-03-10T12:00:00.000+0000',
    });
  });
});

describe('fetchJiraIssueChangelogWithComments', () => {
  it('maps dedicated changelog + comments', async () => {
    const get = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/changelog')) {
        return Promise.resolve({ data: { values: [statusHistory] } });
      }
      return Promise.resolve({
        data: {
          comments: [
            {
              author: { displayName: 'Ada', name: 'ada' },
              body: 'Looks good',
              created: '2026-03-10T13:00:00.000+0000',
              id: '20001',
              updated: '2026-03-10T13:00:00.000+0000',
            },
          ],
        },
      });
    });
    const result = await fetchJiraIssueChangelogWithComments(apiWithGet(get), 'PROJ-1');
    expect(result.comments).toEqual([
      expect.objectContaining({
        createdBy: { display: 'Ada', id: 'ada' },
        id: 20001,
        text: 'Looks good',
      }),
    ]);
    expect(result.changelog).toEqual([
      expect.objectContaining({
        fields: [
          expect.objectContaining({
            field: { display: 'status', id: 'status' },
            to: expect.objectContaining({ key: 'closed' }),
          }),
        ],
      }),
    ]);
    expect(jiraChangelogLogsFromHistories([statusHistory])).toHaveLength(1);
  });

  it('falls back to expand=changelog when /changelog is 404', async () => {
    const get = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/changelog')) {
        const error = new Error('not found') as Error & { response: { status: number } };
        error.response = { status: 404 };
        return Promise.reject(error);
      }
      if (String(url).includes('/comment')) {
        return Promise.resolve({ data: { comments: [] } });
      }
      return Promise.resolve({
        data: { changelog: { histories: [statusHistory] }, key: 'PROJ-1' },
      });
    });
    const result = await fetchJiraIssueChangelogWithComments(apiWithGet(get), 'PROJ-1');
    expect(result.changelog).toHaveLength(1);
    expect(get).toHaveBeenCalledWith('/issue/PROJ-1', {
      params: { expand: 'changelog', fields: 'summary' },
    });
  });
});
