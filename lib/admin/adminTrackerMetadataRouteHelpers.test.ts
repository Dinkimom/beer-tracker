import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiCache } from '@/lib/cache';

import { loadCachedTrackerOrgMetadata } from './adminTrackerMetadataRouteHelpers';

vi.mock('@/lib/trackerIntegration/fetchTrackerOrgMetadata', () => ({
  fetchTrackerFieldEnumValues: vi.fn(),
  fetchTrackerOrganizationFields: vi.fn(() =>
    Promise.resolve([{ display: 'Story Points', id: 'customfield_1', key: 'customfield_1' }])
  ),
  fetchTrackerOrganizationStatuses: vi.fn(() =>
    Promise.resolve([{ display: 'To Do', id: '1', key: 'todo' }])
  ),
}));

import {
  fetchTrackerOrganizationFields,
  fetchTrackerOrganizationStatuses,
} from '@/lib/trackerIntegration/fetchTrackerOrgMetadata';

beforeEach(() => {
  apiCache.clear();
  vi.mocked(fetchTrackerOrganizationFields).mockClear();
  vi.mocked(fetchTrackerOrganizationStatuses).mockClear();
});

describe('loadCachedTrackerOrgMetadata', () => {
  const api = {} as never;

  it('caches fields and statuses until forceRefresh', async () => {
    const first = await loadCachedTrackerOrgMetadata({
      api,
      fingerprint: 'fp',
      kind: 'jira-cloud',
      orgId: 'org-1',
      resource: 'all',
    });
    expect(first.fields).toHaveLength(1);
    expect(fetchTrackerOrganizationFields).toHaveBeenCalledTimes(1);

    await loadCachedTrackerOrgMetadata({
      api,
      fingerprint: 'fp',
      kind: 'jira-cloud',
      orgId: 'org-1',
      resource: 'all',
    });
    expect(fetchTrackerOrganizationFields).toHaveBeenCalledTimes(1);

    await loadCachedTrackerOrgMetadata({
      api,
      fingerprint: 'fp',
      forceRefresh: true,
      kind: 'jira-cloud',
      orgId: 'org-1',
      resource: 'all',
    });
    expect(fetchTrackerOrganizationFields).toHaveBeenCalledTimes(2);
    expect(fetchTrackerOrganizationStatuses).toHaveBeenCalledTimes(2);
  });
});
