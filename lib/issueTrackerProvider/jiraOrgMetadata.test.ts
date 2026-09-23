import { describe, expect, it, vi } from 'vitest';

import {
  fetchJiraOrganizationFields,
  fetchJiraOrganizationStatuses,
  mapJiraFieldToMetadata,
  mapJiraStatusToMetadata,
} from './jiraOrgMetadata';

describe('mapJiraFieldToMetadata', () => {
  it('maps system and custom fields', () => {
    expect(
      mapJiraFieldToMetadata({
        id: 'summary',
        name: 'Summary',
        schema: { type: 'string' },
      })
    ).toEqual({
      display: 'Summary',
      id: 'summary',
      key: 'summary',
      name: 'Summary',
      schemaType: 'string',
    });
    expect(
      mapJiraFieldToMetadata({
        id: 'customfield_10001',
        key: 'customfield_10001',
        name: 'Team',
        schema: { custom: 'com.atlassian.jira.plugin.system.customfieldtypes:select', type: 'option' },
      })?.schemaType
    ).toBe('option');
  });
});

describe('mapJiraStatusToMetadata', () => {
  it('uses normalized status name as key (same as issues) and keeps id', () => {
    expect(
      mapJiraStatusToMetadata({
        description: 'Issue is open',
        id: '1',
        name: 'Open',
        statusCategory: { id: 2, key: 'new', name: 'To Do' },
      })
    ).toEqual({
      description: 'Issue is open',
      display: 'Open',
      id: '1',
      key: 'open',
      statusType: { display: 'To Do', id: '2', key: 'new' },
    });
  });

  it('falls back to id as key when name is missing', () => {
    expect(mapJiraStatusToMetadata({ id: '42' })).toEqual({
      description: undefined,
      display: '42',
      id: '42',
      key: '42',
      statusType: undefined,
    });
  });
});

describe('fetchJiraOrganizationFields/statuses', () => {
  it('GETs /field and /status', async () => {
    const get = vi.fn((url: string) => {
      if (url === '/field') {
        return Promise.resolve({ data: [{ id: 'summary', name: 'Summary' }] });
      }
      if (url === '/status') {
        return Promise.resolve({ data: [{ id: '1', name: 'Open' }] });
      }
      return Promise.reject(new Error(url));
    });
    await expect(fetchJiraOrganizationFields({ get } as never)).resolves.toEqual([
      {
        display: 'Summary',
        id: 'summary',
        key: 'summary',
        name: 'Summary',
        schemaType: undefined,
      },
    ]);
    await expect(fetchJiraOrganizationStatuses({ get } as never)).resolves.toEqual([
      {
        description: undefined,
        display: 'Open',
        id: '1',
        key: 'open',
        statusType: undefined,
      },
    ]);
  });
});
