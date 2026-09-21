import type { TrackerIssue } from '@/types/tracker';

import { describe, expect, it, vi } from 'vitest';

import { mapTrackerIssueToTask } from '@/lib/trackerApi/issues';

import {
  extractJiraIssueRows,
  fetchJiraIssue,
  mapJiraRestIssueToTrackerIssue,
  mapJiraSprintField,
  normalizeJiraIssue,
  searchJiraIssuesInSprint,
} from './jiraIssues';

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

describe('extractJiraIssueRows', () => {
  it('reads Agile/JQL issues pages', () => {
    expect(extractJiraIssueRows({ issues: [{ key: 'PROJ-1' }] })).toEqual([{ key: 'PROJ-1' }]);
    expect(extractJiraIssueRows([])).toEqual([]);
  });
});

describe('mapJiraSprintField', () => {
  it('maps Agile sprint objects and GreenHopper strings', () => {
    expect(
      mapJiraSprintField({
        closedSprints: [{ id: 1, name: 'Old' }],
        sprint: {
          id: 78804,
          name: 'Booking 12',
        },
      })
    ).toEqual([
      { display: 'Booking 12', id: '78804' },
      { display: 'Old', id: '1' },
    ]);
    expect(
      mapJiraSprintField({
        sprint:
          'com.atlassian.greenhopper.service.sprint.Sprint@ab[id=78804,rapidViewId=14684,state=ACTIVE,name=Booking 12,startDate=]',
      })
    ).toEqual([{ display: 'Booking 12', id: '78804' }]);
  });
});

describe('mapJiraRestIssueToTrackerIssue', () => {
  it('maps a Jira Software issue onto TrackerIssue', () => {
    expect(
      mapJiraRestIssueToTrackerIssue({
        fields: {
          assignee: { displayName: 'Ada', name: 'ada' },
          created: '2026-08-31T09:00:00.000+0300',
          description: 'Body',
          issuetype: { name: 'Bug' },
          parent: { fields: { summary: 'Story' }, key: 'PROJ-10', self: 'https://jira/PROJ-10' },
          priority: { name: 'High' },
          project: { key: 'PROJ', name: 'Booking' },
          sprint: { id: 78804, name: 'Booking 12' },
          status: { name: 'In Progress', statusCategory: { key: 'indeterminate' } },
          summary: 'Fix login',
          updated: '2026-09-01T10:00:00.000+0300',
        },
        id: 10001,
        key: 'PROJ-1',
        self: 'https://jira.example.com/rest/api/2/issue/10001',
      })
    ).toEqual({
      assignee: { display: 'Ada', id: 'ada' },
      createdAt: '2026-08-31T09:00:00.000+0300',
      description: 'Body',
      id: '10001',
      key: 'PROJ-1',
      parent: {
        display: 'Story',
        id: 'PROJ-10',
        key: 'PROJ-10',
        self: 'https://jira/PROJ-10',
      },
      priority: { display: 'High', key: 'high' },
      queue: { display: 'Booking', id: 'PROJ', key: 'PROJ', self: '' },
      self: 'https://jira.example.com/rest/api/2/issue/10001',
      sprint: [{ display: 'Booking 12', id: '78804' }],
      status: { display: 'In Progress', key: 'inprogress', statusTypeKey: 'inProgress' },
      statusType: { display: 'In Progress', key: 'inProgress' },
      summary: 'Fix login',
      type: { display: 'Bug', key: 'bug' },
      updatedAt: '2026-09-01T10:00:00.000+0300',
    });
  });

  it('stringifies numeric parent and epic ids', () => {
    expect(
      mapJiraRestIssueToTrackerIssue({
        fields: {
          epic: { id: 55, key: 'PROJ-0', name: 'Booking epic' },
          parent: { fields: { summary: 'Story' }, id: 10010, key: 'PROJ-10' },
          summary: 'Fix login',
        },
        key: 'PROJ-1',
      })
    ).toEqual(
      expect.objectContaining({
        epic: {
          display: 'Booking epic',
          id: '55',
          key: 'PROJ-0',
          self: '',
        },
        parent: {
          display: 'Story',
          id: '10010',
          key: 'PROJ-10',
          self: '',
        },
      })
    );
  });

  it('keeps custom estimate fields for admin testingFlow mapping', () => {
    const issue = mapJiraRestIssueToTrackerIssue({
      fields: {
        customfield_10016: 8,
        customfield_10100: 3,
        summary: 'Fix login',
      },
      key: 'PROJ-1',
    });
    expect(issue).toEqual(
      expect.objectContaining({
        customfield_10016: 8,
        customfield_10100: 3,
        key: 'PROJ-1',
        summary: 'Fix login',
      })
    );
    expect(
      mapTrackerIssueToTask(issue!, {
        configRevision: 1,
        testingFlow: {
          devEstimateFieldId: 'customfield_10016',
          mode: 'embedded_in_dev',
          qaEstimateFieldId: 'customfield_10100',
        },
      })
    ).toMatchObject({ storyPoints: 8, testPoints: 3 });
  });

  it('skips issues without a key and converts ADF descriptions', () => {
    expect(mapJiraRestIssueToTrackerIssue({ fields: { summary: 'x' } })).toBeNull();
    expect(
      mapJiraRestIssueToTrackerIssue({
        fields: {
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Cloud body' }],
              },
            ],
          },
          status: { statusCategory: { key: 'done' } },
        },
        key: 'PROJ-2',
      })?.description
    ).toBe('Cloud body');
    expect(
      mapJiraRestIssueToTrackerIssue({
        fields: { description: { type: 'doc', content: [] }, status: { statusCategory: { key: 'done' } } },
        key: 'PROJ-2',
      })?.description
    ).toBeUndefined();
    expect(
      mapJiraRestIssueToTrackerIssue({
        fields: { status: { name: 'Done', statusCategory: { key: 'done' } } },
        key: 'PROJ-2',
      })?.status
    ).toEqual({ display: 'Done', key: 'done', statusTypeKey: 'done' });
  });
});

describe('normalizeJiraIssue', () => {
  it('marks the provider as jira', () => {
    expect(
      normalizeJiraIssue({ id: '1', key: 'PROJ-1', self: '', summary: 'Fix' }).provider
    ).toBe('jira');
  });

  it('copies leftover TrackerIssue keys into customFields', () => {
    expect(
      normalizeJiraIssue({
        customfield_10016: 5,
        id: '1',
        key: 'PROJ-1',
        self: '',
        summary: 'Fix',
      } as TrackerIssue).customFields
    ).toEqual({ customfield_10016: 5 });
  });
});

describe('searchJiraIssuesInSprint', () => {
  it('loads Agile sprint issues', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        isLast: true,
        issues: [
          {
            fields: { summary: 'Fix login', status: { statusCategory: { key: 'new' } } },
            key: 'PROJ-1',
          },
        ],
        total: 1,
      },
    });
    const issues = await searchJiraIssuesInSprint(apiWith({ get }), 78804);
    expect(get).toHaveBeenCalledWith('https://jira.example.com/rest/agile/1.0/sprint/78804/issue', {
      params: { fields: '*all', maxResults: 50, startAt: 0 },
    });
    expect(issues).toEqual([expect.objectContaining({ key: 'PROJ-1', summary: 'Fix login' })]);
  });

  it('falls back to JQL search when Agile fails', async () => {
    const get = vi.fn().mockRejectedValue(new Error('no agile'));
    const post = vi.fn().mockResolvedValue({
      data: {
        issues: [{ fields: { summary: 'From JQL' }, key: 'PROJ-9' }],
        total: 1,
      },
    });
    const issues = await searchJiraIssuesInSprint(apiWith({ get, post }), 78804);
    expect(post).toHaveBeenCalledWith('/search', {
      fields: ['*all'],
      jql: 'sprint = 78804',
      maxResults: 50,
      startAt: 0,
    });
    expect(issues).toEqual([expect.objectContaining({ key: 'PROJ-9', summary: 'From JQL' })]);
  });
});

describe('fetchJiraIssue', () => {
  it('GETs /issue/{key} and maps the payload', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        fields: {
          sprint: { id: 78804, name: 'Booking 12' },
          summary: 'Fix login',
        },
        key: 'PROJ-1',
      },
    });
    await expect(fetchJiraIssue(apiWith({ get }), 'PROJ-1')).resolves.toEqual(
      expect.objectContaining({
        key: 'PROJ-1',
        provider: 'jira',
        sprint: [{ display: 'Booking 12', id: '78804' }],
        summary: 'Fix login',
      })
    );
    expect(get).toHaveBeenCalledWith('/issue/PROJ-1');
  });

  it('returns null for 404', async () => {
    const get = vi.fn().mockRejectedValue({ response: { status: 404 } });
    await expect(fetchJiraIssue(apiWith({ get }), 'PROJ-missing')).resolves.toBeNull();
  });
});

