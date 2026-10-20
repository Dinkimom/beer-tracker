import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiCache } from '@/lib/cache';

import { invalidateCachedTrackerIssueLinks } from './trackerIssueLinksCache';
import {
  ISSUE_LINKS_BATCH_MAX_KEYS,
  listTrackerIssueLinkEdges,
  normalizeIssueKeysForLinkBatch,
  rememberHarvestedIssueLinks,
  trackerIssueLinkToEdge,
} from './trackerIssueLinksRouteHelpers';

const ORG = 'org-links-test';

function relates(id: string, linkedIssueKey: string) {
  return {
    id,
    direction: 'outward' as const,
    relationship: 'relates' as const,
    linkedIssueKey,
  };
}

describe('trackerIssueLinksRouteHelpers', () => {
  afterEach(() => {
    invalidateCachedTrackerIssueLinks(ORG, ['A-1', 'B-2', 'C-3']);
  });

  it('normalizes and caps issue keys', () => {
    expect(normalizeIssueKeysForLinkBatch([' A-1 ', 'A-1', '', 'B-2'])).toEqual(['A-1', 'B-2']);
    const many = Array.from({ length: ISSUE_LINKS_BATCH_MAX_KEYS + 5 }, (_, i) => `T-${i}`);
    expect(normalizeIssueKeysForLinkBatch(many)).toHaveLength(ISSUE_LINKS_BATCH_MAX_KEYS);
  });

  it('maps a provider link to a from→to edge', () => {
    expect(
      trackerIssueLinkToEdge('A-1', {
        id: '9',
        direction: 'outward',
        relationship: 'blocks',
        linkedIssueKey: 'B-2',
      })
    ).toEqual({
      id: '9',
      fromIssueKey: 'A-1',
      toIssueKey: 'B-2',
      relationship: 'blocks',
      direction: 'outward',
    });
  });

  it('dedupes edges by tracker link id across issues', async () => {
    const listIssueLinks = vi.fn();
    const listIssueLinksBatch = vi.fn(() =>
      Promise.resolve({
        'A-1': [relates('shared', 'B-2')],
        'B-2': [
          {
            id: 'shared',
            direction: 'inward' as const,
            relationship: 'relates' as const,
            linkedIssueKey: 'A-1',
          },
        ],
      })
    );

    const edges = await listTrackerIssueLinkEdges({
      issueKeys: ['A-1', 'B-2'],
      issueTracker: { listIssueLinks, listIssueLinksBatch },
      organizationId: ORG,
    });

    expect(listIssueLinksBatch).toHaveBeenCalledTimes(1);
    expect(listIssueLinks).not.toHaveBeenCalled();
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ id: 'shared', fromIssueKey: 'A-1', toIssueKey: 'B-2' });
  });

  it('serves cached per-issue links on the second batch call', async () => {
    const listIssueLinks = vi.fn();
    const listIssueLinksBatch = vi.fn((keys: string[]) =>
      Promise.resolve(
        Object.fromEntries(keys.map((key) => [key, [relates(`link-${key}`, 'C-3')]]))
      )
    );

    const first = await listTrackerIssueLinkEdges({
      issueKeys: ['A-1', 'B-2'],
      issueTracker: { listIssueLinks, listIssueLinksBatch },
      organizationId: ORG,
    });
    expect(listIssueLinksBatch).toHaveBeenCalledTimes(1);
    expect(first).toHaveLength(2);

    listIssueLinksBatch.mockClear();
    const second = await listTrackerIssueLinkEdges({
      issueKeys: ['A-1', 'B-2'],
      issueTracker: { listIssueLinks, listIssueLinksBatch },
      organizationId: ORG,
    });
    expect(listIssueLinksBatch).not.toHaveBeenCalled();
    expect(second).toHaveLength(2);

    expect(apiCache.get(`tracker:issue-links:v2:${ORG}:A-1`)).not.toBeNull();
  });

  it('fetches only cache misses when the batch grows', async () => {
    const listIssueLinks = vi.fn();
    const listIssueLinksBatch = vi.fn((keys: string[]) =>
      Promise.resolve(
        Object.fromEntries(keys.map((key) => [key, [relates(`link-${key}`, 'Z-9')]]))
      )
    );

    await listTrackerIssueLinkEdges({
      issueKeys: ['A-1'],
      issueTracker: { listIssueLinks, listIssueLinksBatch },
      organizationId: ORG,
    });
    listIssueLinksBatch.mockClear();

    await listTrackerIssueLinkEdges({
      issueKeys: ['A-1', 'B-2'],
      issueTracker: { listIssueLinks, listIssueLinksBatch },
      organizationId: ORG,
    });
    expect(listIssueLinksBatch).toHaveBeenCalledTimes(1);
    expect(listIssueLinksBatch).toHaveBeenCalledWith(['B-2']);
  });

  it('falls back to per-issue fetches when the batch request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const listIssueLinksBatch = vi.fn(() => Promise.reject(new Error('search down')));
    const listIssueLinks = vi.fn((key: string) => Promise.resolve([relates(`link-${key}`, 'C-3')]));

    const edges = await listTrackerIssueLinkEdges({
      issueKeys: ['A-1'],
      issueTracker: { listIssueLinks, listIssueLinksBatch },
      organizationId: ORG,
    });

    expect(listIssueLinks).toHaveBeenCalledWith('A-1');
    expect(edges).toHaveLength(1);
  });

  it('remembers links harvested with the sprint issue payload', async () => {
    rememberHarvestedIssueLinks(ORG, [
      { key: 'A-1', issueLinks: [relates('from-search', 'B-2')] },
    ]);
    const listIssueLinksBatch = vi.fn();
    const edges = await listTrackerIssueLinkEdges({
      issueKeys: ['A-1'],
      issueTracker: { listIssueLinks: vi.fn(), listIssueLinksBatch },
      organizationId: ORG,
    });
    expect(listIssueLinksBatch).not.toHaveBeenCalled();
    expect(edges[0]).toMatchObject({ id: 'from-search', fromIssueKey: 'A-1', toIssueKey: 'B-2' });
  });
});
