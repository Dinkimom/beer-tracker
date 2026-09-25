import { describe, expect, it, vi } from 'vitest';

import {
  fetchJiraFieldEnumValues,
  fetchJiraOrganizationFields,
  fetchJiraOrganizationStatuses,
  mapJiraFieldToMetadata,
  mapJiraStatusToMetadata,
  readJiraOptionLabels,
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

describe('readJiraOptionLabels', () => {
  it('reads string and object option labels', () => {
    expect(
      readJiraOptionLabels([' frontend ', { value: 'backend' }, { name: 'QA' }, { value: '  ' }, null])
    ).toEqual(['frontend', 'backend', 'QA']);
  });
});

describe('fetchJiraFieldEnumValues', () => {
  it('loads select options from field contexts', async () => {
    const get = vi.fn((url: string) => {
      if (url.endsWith('/context')) {
        return Promise.resolve({ data: { values: [{ id: '10156' }] } });
      }
      if (url.includes('/option')) {
        return Promise.resolve({
          data: {
            isLast: true,
            values: [
              { disabled: false, id: '1', value: 'frontend' },
              { disabled: true, id: '2', value: 'backend' },
            ],
          },
        });
      }
      return Promise.reject(new Error(url));
    });

    await expect(fetchJiraFieldEnumValues({ get } as never, 'customfield_10050')).resolves.toEqual([
      'frontend',
      'backend',
    ]);
  });

  it('loads component names from every project', async () => {
    const get = vi.fn((url: string) => {
      if (url === '/project') {
        return Promise.resolve({ data: [{ key: 'RND' }, { key: 'BRZ' }, { key: '' }] });
      }
      if (url === '/project/RND/components') {
        return Promise.resolve({ data: [{ name: 'Backend' }, { name: 'Frontend' }] });
      }
      if (url === '/project/BRZ/components') {
        return Promise.resolve({ data: [{ name: 'Frontend' }, { name: 'Bookings and visits' }] });
      }
      return Promise.reject(new Error(url));
    });

    await expect(fetchJiraFieldEnumValues({ get } as never, 'components')).resolves.toEqual([
      'Backend',
      'Bookings and visits',
      'Frontend',
    ]);
  });

  it('falls back to allowedValues when the field has no context options', async () => {
    const get = vi.fn((url: string) => {
      if (url.endsWith('/context')) {
        return Promise.reject(new Error('no context'));
      }
      return Promise.resolve({
        data: { allowedValues: [{ value: 'yes' }, { name: 'no' }] },
      });
    });

    await expect(fetchJiraFieldEnumValues({ get } as never, 'priority')).resolves.toEqual([
      'yes',
      'no',
    ]);
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
