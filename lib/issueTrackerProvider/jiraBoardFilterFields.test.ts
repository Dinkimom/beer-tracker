import { describe, expect, it, vi } from 'vitest';

import {
  applyJiraBoardFilterFields,
  buildJiraBoardFilterFieldUpdates,
  parseJiraBoardFilterEqualityClauses,
} from './jiraBoardFilterFields';

const TEAM_ID = '3f2a6b1c-1111-2222-3333-444455556666';

const FIELD_CATALOG = [
  { clauseNames: ['project'], id: 'project', name: 'Project', schema: { system: 'project', type: 'project' } },
  {
    clauseNames: ['cf[10001]', 'Team', 'Team[Team]'],
    id: 'customfield_10001',
    name: 'Team',
    schema: { custom: 'com.atlassian.jira.plugin.system.customfieldtypes:atlassian-team', type: 'team' },
  },
  { clauseNames: ['labels'], id: 'labels', name: 'Labels', schema: { items: 'string', system: 'labels', type: 'array' } },
  {
    clauseNames: ['component'],
    id: 'components',
    name: 'Components',
    schema: { items: 'component', system: 'components', type: 'array' },
  },
  {
    clauseNames: ['cf[10200]', 'Area'],
    id: 'customfield_10200',
    name: 'Area',
    schema: { custom: 'com.atlassian.jira.plugin.system.customfieldtypes:select', type: 'option' },
  },
];

describe('parseJiraBoardFilterEqualityClauses', () => {
  it('reads AND-joined equality clauses and drops ORDER BY', () => {
    expect(
      parseJiraBoardFilterEqualityClauses(
        `project = PROJ AND "Team[Team]" = ${TEAM_ID} AND labels in ("backend") ORDER BY Rank ASC`
      )
    ).toEqual([
      { field: 'project', value: 'PROJ' },
      { field: 'Team[Team]', value: TEAM_ID },
      { field: 'labels', value: 'backend' },
    ]);
  });

  it('unwraps parenthesized AND groups', () => {
    expect(parseJiraBoardFilterEqualityClauses('(project = PROJ AND cf[10200] = "Core")')).toEqual([
      { field: 'project', value: 'PROJ' },
      { field: 'cf[10200]', value: 'Core' },
    ]);
  });

  it('ignores filters with top-level OR', () => {
    expect(parseJiraBoardFilterEqualityClauses('project = A OR project = B')).toEqual([]);
  });

  it('skips non-equality, multi-value, function and EMPTY clauses', () => {
    expect(
      parseJiraBoardFilterEqualityClauses(
        'project in (A, B) AND assignee = currentUser() AND Team is EMPTY AND Team = EMPTY AND labels != x'
      )
    ).toEqual([]);
  });

  it('keeps nested OR groups out but reads sibling clauses', () => {
    expect(
      parseJiraBoardFilterEqualityClauses('component = "Web App" AND (labels = a OR labels = b)')
    ).toEqual([{ field: 'component', value: 'Web App' }]);
  });
});

describe('buildJiraBoardFilterFieldUpdates', () => {
  it('maps clauses to settable fields with schema-shaped operations', () => {
    expect(
      buildJiraBoardFilterFieldUpdates(
        `project = PROJ AND "Team[Team]" = "${TEAM_ID}" AND labels = backend AND component = "Web App" AND Area = Core`,
        FIELD_CATALOG
      )
    ).toEqual([
      { fieldId: 'customfield_10001', operation: { set: TEAM_ID } },
      { fieldId: 'labels', operation: { add: 'backend' } },
      { fieldId: 'components', operation: { add: { name: 'Web App' } } },
      { fieldId: 'customfield_10200', operation: { set: { value: 'Core' } } },
    ]);
  });

  it('matches customfield ids and option ids', () => {
    expect(buildJiraBoardFilterFieldUpdates('customfield_10200 = 10300', FIELD_CATALOG)).toEqual([
      { fieldId: 'customfield_10200', operation: { set: { id: '10300' } } },
    ]);
  });
});

describe('applyJiraBoardFilterFields', () => {
  it('reads board filter and PUTs missing board fields', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: { filter: { id: '12345' } } })
      .mockResolvedValueOnce({ data: { jql: `project = PROJ AND Team = ${TEAM_ID} ORDER BY Rank` } })
      .mockResolvedValueOnce({ data: FIELD_CATALOG });
    const put = vi.fn().mockResolvedValue({ data: {} });
    const api = { defaults: { baseURL: 'https://jira.example.com/rest/api/2' }, get, put } as never;

    await applyJiraBoardFilterFields(api, 'PROJ-1', 15116);

    expect(get).toHaveBeenNthCalledWith(
      1,
      'https://jira.example.com/rest/agile/1.0/board/15116/configuration'
    );
    expect(get).toHaveBeenNthCalledWith(2, '/filter/12345');
    expect(put).toHaveBeenCalledWith('/issue/PROJ-1', {
      update: { customfield_10001: [{ set: TEAM_ID }] },
    });
  });

  it('does not throw when board configuration is unavailable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const get = vi.fn().mockRejectedValue(new Error('403'));
    const put = vi.fn();
    const api = { defaults: { baseURL: 'https://jira.example.com/rest/api/2' }, get, put } as never;

    await expect(applyJiraBoardFilterFields(api, 'PROJ-1', 15116)).resolves.toBeUndefined();
    expect(put).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
