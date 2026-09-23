import { describe, expect, it, vi } from 'vitest';

import {
  buildJiraTransitionRequestBody,
  extractJiraTransitionRows,
  fetchJiraIssueTransitions,
  fetchJiraIssueTransitionsBatch,
  fetchJiraQueueWorkflowScreens,
  fetchJiraTransitionFields,
  mapJiraTransition,
  mapJiraTransitionFields,
  transitionJiraIssue,
} from './jiraTransitions';

const START_PROGRESS = {
  id: '21',
  name: 'Start Progress',
  to: { name: 'In Progress', statusCategory: { key: 'indeterminate' } },
};

describe('extractJiraTransitionRows', () => {
  it('reads the REST transitions wrapper and a bare array', () => {
    expect(extractJiraTransitionRows({ transitions: [START_PROGRESS] })).toEqual([START_PROGRESS]);
    expect(extractJiraTransitionRows([START_PROGRESS])).toEqual([START_PROGRESS]);
    expect(extractJiraTransitionRows(null)).toEqual([]);
    expect(extractJiraTransitionRows({})).toEqual([]);
  });
});

describe('mapJiraTransition', () => {
  it('maps Jira transition ids onto status name keys', () => {
    expect(mapJiraTransition(START_PROGRESS)).toEqual({
      display: 'Start Progress',
      id: '21',
      to: { display: 'In Progress', key: 'inprogress', statusTypeKey: 'inProgress' },
    });
    expect(
      mapJiraTransition({
        id: 31,
        name: 'Resolve',
        to: { name: 'Done', statusCategory: { key: 'done' } },
      })
    ).toEqual({
      display: 'Resolve',
      id: '31',
      to: { display: 'Done', key: 'done', statusTypeKey: 'done' },
    });
    expect(
      mapJiraTransition({
        id: '11',
        to: { name: 'Open', statusCategory: { key: 'new' } },
      })
    ).toEqual({
      display: 'Open',
      id: '11',
      to: { display: 'Open', key: 'open', statusTypeKey: 'new' },
    });
  });

  it('keeps Jira status id on transition.to for id-keyed palette overrides', () => {
    expect(
      mapJiraTransition({
        id: '21',
        name: 'Start Progress',
        to: {
          id: '10009',
          name: 'Blocked',
          statusCategory: { key: 'indeterminate' },
        },
      })
    ).toEqual({
      display: 'Start Progress',
      id: '21',
      to: {
        display: 'Blocked',
        id: '10009',
        key: 'blocked',
        statusTypeKey: 'inProgress',
      },
    });
  });

  it('skips rows without an id', () => {
    expect(mapJiraTransition(null)).toBeNull();
    expect(mapJiraTransition({ name: 'Start' })).toBeNull();
  });
});

describe('mapJiraTransitionFields', () => {
  it('maps required resolution options from allowedValues', () => {
    expect(
      mapJiraTransitionFields({
        resolution: {
          allowedValues: [
            { id: '1', name: 'Fixed' },
            { id: '2', name: "Won't Fix" },
          ],
          name: 'Resolution',
          required: true,
          schema: { type: 'resolution' },
        },
      })
    ).toEqual([
      {
        display: 'Resolution',
        id: 'resolution',
        options: [
          { label: 'Fixed', value: '1' },
          { label: "Won't Fix", value: '2' },
        ],
        required: true,
        schemaItems: undefined,
        schemaType: 'resolution',
      },
    ]);
  });
});

describe('buildJiraTransitionRequestBody', () => {
  it('puts Yandex-style comment and resolution onto the Jira payload', () => {
    expect(
      buildJiraTransitionRequestBody('21', {
        comment: 'Moving forward',
        resolution: 'fixed',
      })
    ).toEqual({
      fields: { resolution: { name: 'Fixed' } },
      transition: { id: '21' },
      update: { comment: [{ add: { body: 'Moving forward' } }] },
    });
    expect(buildJiraTransitionRequestBody('21', { resolution: '1' })).toEqual({
      fields: { resolution: { id: '1' } },
      transition: { id: '21' },
    });
    expect(buildJiraTransitionRequestBody('21', {})).toEqual({
      transition: { id: '21' },
    });
  });
});

describe('fetchJiraIssueTransitions', () => {
  it('GETs /issue/{key}/transitions and maps the payload', async () => {
    const get = vi.fn().mockResolvedValue({ data: { transitions: [START_PROGRESS] } });
    await expect(fetchJiraIssueTransitions({ get } as never, 'PROJ-6048')).resolves.toEqual([
      {
        display: 'Start Progress',
        id: '21',
        to: { display: 'In Progress', key: 'inprogress', statusTypeKey: 'inProgress' },
      },
    ]);
    expect(get).toHaveBeenCalledWith('/issue/PROJ-6048/transitions');
  });

  it('returns an empty list for a blank key without calling the API', async () => {
    const get = vi.fn();
    await expect(fetchJiraIssueTransitions({ get } as never, '  ')).resolves.toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });
});

describe('fetchJiraIssueTransitionsBatch', () => {
  it('loads each issue and skips failed keys', async () => {
    const get = vi.fn((url: string) => {
      if (url === '/issue/PROJ-1/transitions') {
        return Promise.resolve({ data: { transitions: [START_PROGRESS] } });
      }
      return Promise.reject(new Error(url));
    });
    await expect(
      fetchJiraIssueTransitionsBatch({ get } as never, ['PROJ-1', 'PROJ-2', 'PROJ-1'])
    ).resolves.toEqual({
      'PROJ-1': [
        {
          display: 'Start Progress',
          id: '21',
          to: { display: 'In Progress', key: 'inprogress', statusTypeKey: 'inProgress' },
        },
      ],
    });
  });
});

describe('fetchJiraQueueWorkflowScreens', () => {
  it('returns an empty catalog because Jira has no project-level screen list', async () => {
    await expect(fetchJiraQueueWorkflowScreens()).resolves.toEqual({});
  });
});

describe('fetchJiraTransitionFields', () => {
  it('expands transition fields and picks the matching id', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        transitions: [
          {
            fields: {
              resolution: { name: 'Resolution', required: true, schema: { type: 'resolution' } },
            },
            id: '31',
            name: 'Resolve',
          },
        ],
      },
    });
    await expect(fetchJiraTransitionFields({ get } as never, 'PROJ-1', '31')).resolves.toEqual([
      {
        display: 'Resolution',
        id: 'resolution',
        required: true,
        schemaItems: undefined,
        schemaType: 'resolution',
      },
    ]);
    expect(get).toHaveBeenCalledWith('/issue/PROJ-1/transitions', {
      params: { expand: 'transitions.fields' },
    });
  });
});

describe('transitionJiraIssue', () => {
  it('POSTs the Jira transitions endpoint', async () => {
    const post = vi.fn().mockResolvedValue({ data: {} });
    await expect(
      transitionJiraIssue({ post } as never, 'PROJ-1', '21', { comment: 'Go' })
    ).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith('/issue/PROJ-1/transitions', {
      transition: { id: '21' },
      update: { comment: [{ add: { body: 'Go' } }] },
    });
  });
});
