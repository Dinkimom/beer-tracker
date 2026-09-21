import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchJiraBoardParams,
  jiraAgileBoardConfigurationUrl,
  mapJiraBoardConfigColumns,
} from './jiraBoardParams';
import { fetchJiraBoardById } from './jiraCatalog';
import { fetchJiraOrganizationStatuses } from './jiraOrgMetadata';

vi.mock('./jiraCatalog', async () => {
  const actual = await vi.importActual('./jiraCatalog');
  return {
    ...(actual as Record<string, unknown>),
    fetchJiraBoardById: vi.fn(),
  };
});

vi.mock('./jiraOrgMetadata', () => ({
  fetchJiraOrganizationStatuses: vi.fn(),
}));

const API_BASE = 'https://jira.example.com/rest/api/2';

beforeEach(() => {
  vi.mocked(fetchJiraBoardById).mockResolvedValue({ id: 15116, name: 'Booking' });
  vi.mocked(fetchJiraOrganizationStatuses).mockResolvedValue([
    { display: 'To Do', id: '10000', key: '10000' },
    { display: 'In Progress', id: '3', key: '3' },
    { display: 'Done', id: '10001', key: '10001' },
  ]);
});

describe('jiraAgileBoardConfigurationUrl', () => {
  it('maps rest/api base onto Agile board configuration', () => {
    expect(jiraAgileBoardConfigurationUrl(API_BASE, 15116)).toBe(
      'https://jira.example.com/rest/agile/1.0/board/15116/configuration'
    );
  });
});

describe('mapJiraBoardConfigColumns', () => {
  it('maps column names and resolves status ids to display + name keys', () => {
    const columns = mapJiraBoardConfigColumns(
      [
        { name: 'To Do', statuses: [{ id: '10000' }] },
        { name: 'Doing', statuses: [{ id: '3' }, { id: '99' }] },
        { name: 'Done', statuses: [{ id: '10001' }] },
      ],
      new Map([
        ['10000', 'To Do'],
        ['3', 'In Progress'],
        ['10001', 'Done'],
      ]),
      'https://jira.example.com/rest/agile/1.0/board/15116'
    );
    expect(columns).toEqual([
      {
        display: 'To Do',
        id: '1',
        self: 'https://jira.example.com/rest/agile/1.0/board/15116/columns/1',
        statusKeys: ['10000', 'To Do', 'todo'],
      },
      {
        display: 'Doing',
        id: '2',
        self: 'https://jira.example.com/rest/agile/1.0/board/15116/columns/2',
        statusKeys: ['3', 'In Progress', 'inprogress', '99'],
      },
      {
        display: 'Done',
        id: '3',
        self: 'https://jira.example.com/rest/agile/1.0/board/15116/columns/3',
        statusKeys: ['10001', 'Done', 'done'],
      },
    ]);
  });
});

describe('fetchJiraBoardParams', () => {
  it('returns BoardParams with columns from Agile configuration', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        columnConfig: {
          columns: [
            { name: 'To Do', statuses: [{ id: '10000' }] },
            { name: 'Done', statuses: [{ id: '10001' }] },
          ],
        },
        id: 15116,
        name: 'Booking',
      },
    });
    await expect(
      fetchJiraBoardParams({ defaults: { baseURL: API_BASE }, get } as never, 15116)
    ).resolves.toEqual({
      columns: [
        {
          display: 'To Do',
          id: '1',
          self: 'https://jira.example.com/rest/agile/1.0/board/15116/columns/1',
          statusKeys: ['10000', 'To Do', 'todo'],
        },
        {
          display: 'Done',
          id: '2',
          self: 'https://jira.example.com/rest/agile/1.0/board/15116/columns/2',
          statusKeys: ['10001', 'Done', 'done'],
        },
      ],
      id: 15116,
      name: 'Booking',
      self: 'https://jira.example.com/rest/agile/1.0/board/15116',
    });
    expect(get).toHaveBeenCalledWith(
      'https://jira.example.com/rest/agile/1.0/board/15116/configuration'
    );
  });

  it('returns board without columns when configuration is unavailable', async () => {
    const get = vi.fn().mockRejectedValue(new Error('403'));
    await expect(
      fetchJiraBoardParams({ defaults: { baseURL: API_BASE }, get } as never, 15116)
    ).resolves.toEqual({
      columns: [],
      id: 15116,
      name: 'Booking',
      self: 'https://jira.example.com/rest/agile/1.0/board/15116',
    });
  });
});
