import type {
  IssueTrackerCreateIssueLinkInput,
  IssueTrackerIssueLink,
  IssueTrackerProviderClient,
} from '@/lib/issueTrackerProvider/types';

import {
  getCachedTrackerIssueLinks,
  invalidateCachedTrackerIssueLinks,
  setCachedTrackerIssueLinks,
  type TrackerIssueLinkEdge,
} from './trackerIssueLinksCache';

export type { TrackerIssueLinkEdge } from './trackerIssueLinksCache';

/** Max issueKeys per POST /api/issues/links/batch. Client chunks larger lists. */
export const ISSUE_LINKS_BATCH_MAX_KEYS = 80;
const LIST_CONCURRENCY = 6;

export function normalizeIssueKeysForLinkBatch(issueKeys: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of issueKeys) {
    const key = raw.trim();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(key);
    if (out.length >= ISSUE_LINKS_BATCH_MAX_KEYS) {
      break;
    }
  }
  return out;
}

/** Одна физическая связь → ребро from→to с точки зрения fromIssueKey. */
export function trackerIssueLinkToEdge(
  issueKey: string,
  link: IssueTrackerIssueLink
): TrackerIssueLinkEdge {
  return {
    id: link.id,
    fromIssueKey: issueKey,
    toIssueKey: link.linkedIssueKey,
    relationship: link.relationship,
    ...(link.relationshipLabel ? { relationshipLabel: link.relationshipLabel } : {}),
    direction: link.direction,
  };
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await mapper(items[index]!);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function dedupeTrackerIssueLinkEdges(perKey: TrackerIssueLinkEdge[][]): TrackerIssueLinkEdge[] {
  const byId = new Map<string, TrackerIssueLinkEdge>();
  for (const edges of perKey) {
    for (const edge of edges) {
      if (!byId.has(edge.id)) {
        byId.set(edge.id, edge);
      }
    }
  }
  return [...byId.values()];
}

type IssueLinkLister = Pick<IssueTrackerProviderClient, 'listIssueLinks' | 'listIssueLinksBatch'>;

function cacheIssueLinkEdges(
  organizationId: string,
  issueKey: string,
  links: IssueTrackerIssueLink[]
): TrackerIssueLinkEdge[] {
  const edges = links.map((link) => trackerIssueLinkToEdge(issueKey, link));
  setCachedTrackerIssueLinks(organizationId, issueKey, edges);
  return edges;
}

async function fetchAndCacheIssueLinkEdges(input: {
  issueKey: string;
  issueTracker: Pick<IssueTrackerProviderClient, 'listIssueLinks'>;
  organizationId: string;
}): Promise<TrackerIssueLinkEdge[]> {
  try {
    const links = await input.issueTracker.listIssueLinks(input.issueKey);
    return cacheIssueLinkEdges(input.organizationId, input.issueKey, links);
  } catch (error) {
    console.error(`Failed to list issue links for ${input.issueKey}:`, error);
    return [];
  }
}

async function loadMissedIssueLinkEdges(input: {
  issueKeys: string[];
  issueTracker: IssueLinkLister;
  organizationId: string;
}): Promise<TrackerIssueLinkEdge[][]> {
  try {
    const byKey = await input.issueTracker.listIssueLinksBatch(input.issueKeys);
    return input.issueKeys.map((issueKey) =>
      cacheIssueLinkEdges(input.organizationId, issueKey, byKey[issueKey] ?? [])
    );
  } catch (error) {
    console.error('Failed to list issue links in batch, falling back per issue:', error);
    return mapPool(input.issueKeys, LIST_CONCURRENCY, (issueKey) =>
      fetchAndCacheIssueLinkEdges({
        issueKey,
        issueTracker: input.issueTracker,
        organizationId: input.organizationId,
      })
    );
  }
}

/** Кладёт связи, уже пришедшие вместе с задачами спринта, чтобы batch не ходил в трекер. */
export function rememberHarvestedIssueLinks(
  organizationId: string,
  issues: ReadonlyArray<{ issueLinks?: IssueTrackerIssueLink[]; key: string }>
): void {
  for (const issue of issues) {
    if (issue.issueLinks === undefined) {
      continue;
    }
    cacheIssueLinkEdges(organizationId, issue.key, issue.issueLinks);
  }
}

/**
 * Связи из Tracker/Jira без Postgres.
 * Кэш на 30 мин по (org, issueKey). Промахи — одним batch-запросом, не GET на задачу.
 * Дедуп по tracker link id (одна связь может прийти с обеих сторон).
 */
export async function listTrackerIssueLinkEdges(input: {
  issueKeys: string[];
  issueTracker: IssueLinkLister;
  organizationId: string;
}): Promise<TrackerIssueLinkEdge[]> {
  const keys = normalizeIssueKeysForLinkBatch(input.issueKeys);
  if (keys.length === 0) {
    return [];
  }

  const cachedEdges: TrackerIssueLinkEdge[][] = [];
  const misses: string[] = [];
  for (const issueKey of keys) {
    const hit = getCachedTrackerIssueLinks(input.organizationId, issueKey);
    if (hit) {
      cachedEdges.push(hit);
    } else {
      misses.push(issueKey);
    }
  }

  const fetchedEdges =
    misses.length === 0
      ? []
      : await loadMissedIssueLinkEdges({
          issueKeys: misses,
          issueTracker: input.issueTracker,
          organizationId: input.organizationId,
        });

  return dedupeTrackerIssueLinkEdges([...cachedEdges, ...fetchedEdges]);
}

export async function createTrackerIssueLink(input: {
  issueKey: string;
  issueTracker: Pick<IssueTrackerProviderClient, 'createIssueLink'>;
  organizationId: string;
  payload: IssueTrackerCreateIssueLinkInput;
}): Promise<IssueTrackerIssueLink> {
  const link = await input.issueTracker.createIssueLink(input.issueKey, input.payload);
  invalidateCachedTrackerIssueLinks(input.organizationId, [
    input.issueKey,
    input.payload.targetIssueKey,
  ]);
  return link;
}

export async function deleteTrackerIssueLink(input: {
  issueKey: string;
  issueTracker: Pick<IssueTrackerProviderClient, 'deleteIssueLink'>;
  organizationId: string;
  trackerLinkId: string;
}): Promise<void> {
  const cached = getCachedTrackerIssueLinks(input.organizationId, input.issueKey);
  const relatedKey = cached?.find((edge) => edge.id === input.trackerLinkId)?.toIssueKey;
  await input.issueTracker.deleteIssueLink(input.issueKey, input.trackerLinkId);
  invalidateCachedTrackerIssueLinks(
    input.organizationId,
    relatedKey ? [input.issueKey, relatedKey] : [input.issueKey]
  );
}
