import { describe, expect, it, vi } from 'vitest';

import {
  extractJiraBoardRows,
  fetchJiraAgileBoards,
  fetchJiraBoardById,
  fetchJiraBoardProjectKey,
  fetchJiraBoardsForCatalog,
  fetchJiraProjectsAsQueues,
  jiraAgileBoardListUrl,
  jiraAgileBoardSprintsUrl,
  jiraAgileBoardIssuesUrl,
  jiraAgileEpicIssuesUrl,
  jiraAgileEpicNoneIssuesUrl,
  jiraAgileIssueEstimationUrl,
  jiraAgileIssueUrl,
  jiraAgileSprintCreateUrl,
  jiraAgileSprintIssuesUrl,
  jiraGreenhopperRapidViewByIdUrl,
  jiraGreenhopperRapidViewsListUrl,
  jiraGreenhopperSprintCompleteUrl,
  jiraGreenhopperSprintQueryUrl,
  jiraGreenhopperSprintStartUrl,
  mapJiraAgileBoard,
  mapJiraBoardPayload,
  mergeJiraBoardIntoList,
  shouldStopJiraBoardPages,
} from './jiraCatalog';

const API_BASE = 'https://jira.example.com/rest/api/2';

function apiWithGet(get: ReturnType<typeof vi.fn>) {
  return { defaults: { baseURL: API_BASE }, get } as never;
}

describe('jira board urls', () => {
  it('maps rest/api/2 to Agile and GreenHopper Rapid View', () => {
    expect(jiraAgileBoardListUrl('https://jira.example.com/rest/api/2')).toBe(
      'https://jira.example.com/rest/agile/1.0/board'
    );
    expect(jiraGreenhopperRapidViewsListUrl('https://jira.example.com/rest/api/2')).toBe(
      'https://jira.example.com/rest/greenhopper/1.0/rapidviews/list'
    );
    expect(jiraGreenhopperRapidViewByIdUrl('https://jira.example.com/rest/api/2', 14684)).toBe(
      'https://jira.example.com/rest/greenhopper/1.0/rapidview/14684'
    );
    expect(jiraAgileBoardSprintsUrl('https://jira.example.com/rest/api/2', 14684)).toBe(
      'https://jira.example.com/rest/agile/1.0/board/14684/sprint'
    );
    expect(jiraAgileBoardIssuesUrl('https://jira.example.com/rest/api/2', 15116)).toBe(
      'https://jira.example.com/rest/agile/1.0/board/15116/issue'
    );
    expect(jiraAgileSprintCreateUrl('https://jira.example.com/rest/api/2')).toBe(
      'https://jira.example.com/rest/agile/1.0/sprint'
    );
    expect(jiraAgileSprintIssuesUrl('https://jira.example.com/rest/api/2', 78804)).toBe(
      'https://jira.example.com/rest/agile/1.0/sprint/78804/issue'
    );
    expect(jiraAgileIssueUrl('https://jira.example.com/rest/api/2', 'PROJ-1')).toBe(
      'https://jira.example.com/rest/agile/1.0/issue/PROJ-1'
    );
    expect(jiraAgileEpicIssuesUrl('https://jira.example.com/rest/api/2', 'PROJ-10')).toBe(
      'https://jira.example.com/rest/agile/1.0/epic/PROJ-10/issue'
    );
    expect(jiraAgileEpicNoneIssuesUrl('https://jira.example.com/rest/api/2')).toBe(
      'https://jira.example.com/rest/agile/1.0/epic/none/issue'
    );
    expect(jiraAgileIssueEstimationUrl('https://jira.example.com/rest/api/2', 'PROJ-1')).toBe(
      'https://jira.example.com/rest/agile/1.0/issue/PROJ-1/estimation'
    );
    expect(jiraGreenhopperSprintQueryUrl('https://jira.example.com/rest/api/2', 14684)).toBe(
      'https://jira.example.com/rest/greenhopper/1.0/sprintquery/14684'
    );
    expect(jiraGreenhopperSprintStartUrl('https://jira.example.com/rest/api/2', 83866)).toBe(
      'https://jira.example.com/rest/greenhopper/1.0/sprint/83866/start'
    );
    expect(jiraGreenhopperSprintCompleteUrl('https://jira.example.com/rest/api/2', 83866)).toBe(
      'https://jira.example.com/rest/greenhopper/1.0/sprint/83866/complete'
    );
  });
});

describe('mapJiraAgileBoard', () => {
  it('maps id and name', () => {
    expect(mapJiraAgileBoard({ id: 84, name: 'Planner' })).toEqual({ id: 84, name: 'Planner' });
    expect(mapJiraAgileBoard({ id: '9', name: '  ' })).toEqual({ id: 9, name: '9' });
  });
});

describe('mapJiraBoardPayload', () => {
  it('unwraps nested rapidView', () => {
    expect(mapJiraBoardPayload({ rapidView: { id: 14684, name: 'Scrum' } })).toEqual({
      id: 14684,
      name: 'Scrum',
    });
  });
});

describe('extractJiraBoardRows', () => {
  it('reads GreenHopper views', () => {
    expect(extractJiraBoardRows({ views: [{ id: 14684, name: 'R' }] })).toEqual([
      { id: 14684, name: 'R' },
    ]);
  });
});

describe('shouldStopJiraBoardPages', () => {
  it('stops on a GreenHopper dump without pagination metadata', () => {
    expect(shouldStopJiraBoardPages({ views: [{ id: 1 }, { id: 2 }] }, 0, 2, 50)).toBe(true);
  });

  it('continues Agile when isLast is false even if the page is short', () => {
    expect(
      shouldStopJiraBoardPages({ isLast: false, total: 100, values: [{ id: 1 }] }, 0, 1, 50)
    ).toBe(false);
  });
});

describe('mergeJiraBoardIntoList', () => {
  it('prepends a missing Rapid View', () => {
    expect(mergeJiraBoardIntoList([{ id: 1, name: 'A' }], { id: 14684, name: 'R' })).toEqual([
      { id: 14684, name: 'R' },
      { id: 1, name: 'A' },
    ]);
  });
});

describe('fetchJiraProjectsAsQueues', () => {
  it('maps GET /project', async () => {
    const get = vi.fn().mockResolvedValue({
      data: [{ key: 'BT', name: 'Beer Tracker' }],
    });
    await expect(fetchJiraProjectsAsQueues({ get } as never)).resolves.toEqual([
      { key: 'BT', name: 'Beer Tracker' },
    ]);
    expect(get).toHaveBeenCalledWith('/project');
  });
});

describe('fetchJiraAgileBoards', () => {
  it('loads agile boards from site origin', async () => {
    const get = vi.fn().mockResolvedValue({
      data: { isLast: true, values: [{ id: 1, name: 'A' }] },
    });
    const boards = await fetchJiraAgileBoards(apiWithGet(get));
    expect(boards).toEqual([{ id: 1, name: 'A' }]);
    expect(get).toHaveBeenCalledWith('https://jira.example.com/rest/agile/1.0/board', {
      params: { maxResults: 50, startAt: 0 },
    });
  });

  it('keeps paging when Jira returns a short page before total', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        data: { isLast: false, total: 3, values: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] },
      })
      .mockResolvedValueOnce({
        data: { isLast: true, total: 3, values: [{ id: 3, name: 'C' }] },
      });
    await expect(fetchJiraAgileBoards(apiWithGet(get))).resolves.toEqual([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
      { id: 3, name: 'C' },
    ]);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('returns empty when Agile is unavailable', async () => {
    const get = vi.fn().mockRejectedValue(new Error('404'));
    await expect(fetchJiraAgileBoards(apiWithGet(get))).resolves.toEqual([]);
  });
});

describe('fetchJiraBoardsForCatalog', () => {
  it('includes Rapid View ids from GreenHopper', async () => {
    const get = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('rapidviews/list')) {
        return { data: { views: [{ id: 14684, name: 'Rapid' }] } };
      }
      if (String(url).includes('/rest/agile/')) {
        return { data: { isLast: true, values: [{ id: 1, name: 'Agile' }] } };
      }
      return { data: {} };
    });
    const boards = await fetchJiraBoardsForCatalog(apiWithGet(get));
    expect(boards).toEqual([
      { id: 14684, name: 'Rapid' },
      { id: 1, name: 'Agile' },
    ]);
  });
});

describe('fetchJiraBoardById', () => {
  it('loads a Rapid View by id', async () => {
    const get = vi.fn().mockResolvedValue({ data: { id: 14684, name: 'Team' } });
    await expect(fetchJiraBoardById(apiWithGet(get), 14684)).resolves.toEqual({
      id: 14684,
      name: 'Team',
    });
    expect(get).toHaveBeenCalledWith('https://jira.example.com/rest/greenhopper/1.0/rapidview/14684');
  });

  it('falls back to Agile board by id', async () => {
    const get = vi
      .fn()
      .mockRejectedValueOnce(new Error('404'))
      .mockResolvedValueOnce({ data: { id: 14684, name: 'Agile name' } });
    await expect(fetchJiraBoardById(apiWithGet(get), 14684)).resolves.toEqual({
      id: 14684,
      name: 'Agile name',
    });
    expect(get).toHaveBeenNthCalledWith(
      2,
      'https://jira.example.com/rest/agile/1.0/board/14684'
    );
  });
});

describe('fetchJiraBoardProjectKey', () => {
  it('reads projectKey from Agile board metadata', async () => {
    const get = vi.fn().mockResolvedValue({
      data: { id: 15116, location: { projectKey: 'BOOK' }, name: 'Booking' },
    });
    await expect(fetchJiraBoardProjectKey(apiWithGet(get), 15116)).resolves.toBe('BOOK');
    expect(get).toHaveBeenCalledWith('https://jira.example.com/rest/agile/1.0/board/15116');
  });

  it('returns null when board metadata is unavailable', async () => {
    const get = vi.fn().mockRejectedValue(new Error('404'));
    await expect(fetchJiraBoardProjectKey(apiWithGet(get), 15116)).resolves.toBeNull();
  });
});
