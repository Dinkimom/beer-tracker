import type { AxiosInstance } from 'axios';

import { describe, expect, it } from 'vitest';

import { cacheKeys, trackerConnectionCacheScope } from './cache';

function trackerApi(baseURL: string, orgId?: string): Pick<AxiosInstance, 'defaults'> {
  return { defaults: { baseURL, headers: orgId ? { 'X-Org-ID': orgId } : {} } } as Pick<AxiosInstance, 'defaults'>;
}

describe('cache keys are scoped to the organization or the tracker connection', () => {
  it('separates sprint data of organizations with the same sprint and board ids', () => {
    expect(cacheKeys.sprintIssues('org-1', 42)).not.toBe(cacheKeys.sprintIssues('org-2', 42));
    expect(cacheKeys.sprintInfo('org-1', 42)).not.toBe(cacheKeys.sprintInfo('org-2', 42));
    expect(cacheKeys.sprints('org-1', 7)).not.toBe(cacheKeys.sprints('org-2', 7));
  });

  it('separates tracker metadata of different Yandex Tracker organizations on the same API', () => {
    const first = trackerConnectionCacheScope(trackerApi('https://api.tracker.yandex.net/v2', 'cloud-1'));
    const second = trackerConnectionCacheScope(trackerApi('https://api.tracker.yandex.net/v2', 'cloud-2'));
    expect(first).not.toBe(second);
    expect(cacheKeys.field(first, 'storyPoints')).not.toBe(cacheKeys.field(second, 'storyPoints'));
  });

  it('separates Jira sites by API URL', () => {
    expect(trackerConnectionCacheScope(trackerApi('https://a.atlassian.net'))).not.toBe(
      trackerConnectionCacheScope(trackerApi('https://b.atlassian.net'))
    );
  });
});
