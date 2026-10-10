import type { IssueTrackerIssueLink } from '@/lib/issueTrackerProvider/types';

import { apiCache, cacheKeys } from '@/lib/cache';

/** Одна физическая связь → ребро from→to с точки зрения fromIssueKey. */
export interface TrackerIssueLinkEdge {
  direction: IssueTrackerIssueLink['direction'];
  fromIssueKey: string;
  id: string;
  relationship: IssueTrackerIssueLink['relationship'];
  toIssueKey: string;
}

/** Связи редко меняются вне планера; при мутациях из приложения инвалидируем точечно. */
const TRACKER_ISSUE_LINKS_CACHE_TTL_SEC = 30 * 60;

export function getCachedTrackerIssueLinks(
  organizationId: string,
  issueKey: string
): TrackerIssueLinkEdge[] | null {
  return apiCache.get<TrackerIssueLinkEdge[]>(
    cacheKeys.trackerIssueLinks(organizationId, issueKey)
  );
}

export function setCachedTrackerIssueLinks(
  organizationId: string,
  issueKey: string,
  edges: TrackerIssueLinkEdge[]
): void {
  apiCache.set(
    cacheKeys.trackerIssueLinks(organizationId, issueKey),
    edges,
    TRACKER_ISSUE_LINKS_CACHE_TTL_SEC
  );
}

export function invalidateCachedTrackerIssueLinks(
  organizationId: string,
  issueKeys: Iterable<string>
): void {
  for (const raw of issueKeys) {
    const key = raw.trim();
    if (!key) {
      continue;
    }
    apiCache.delete(cacheKeys.trackerIssueLinks(organizationId, key));
  }
}
