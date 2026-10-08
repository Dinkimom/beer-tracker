import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiCache } from '@/lib/cache';

import { invalidateCachedTrackerIssueLinks } from './trackerIssueLinksCache';
import {
  listTrackerIssueLinkEdges,
  normalizeIssueKeysForLinkBatch,
  trackerIssueLinkToEdge,
} from './trackerIssueLinksRouteHelpers';

const ORG = 'org-links-test';

describe('trackerIssueLinksRouteHelpers', () => {
  afterEach(() => {
    invalidateCachedTrackerIssueLinks(ORG, ['A-1', 'B-2', 'C-3']);
  });

  it('normalizes and caps issue keys', () => {
    expect(normalizeIssueKeysForLinkBatch([' A-1 ', 'A-1', '', 'B-2'])).toEqual(['A-1', 'B-2']);
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
    const listIssueLinks = vi.fn((key: string) => {
      if (key === 'A-1') {
        return Promise.resolve([
          {
            id: 'shared',
            direction: 'outward' as const,
            relationship: 'relates' as const,
            linkedIssueKey: 'B-2',
          },
        ]);
      }
      return Promise.resolve([
        {
          id: 'shared',
          direction: 'inward' as const,
          relationship: 'relates' as const,
          linkedIssueKey: 'A-1',
        },
      ]);
    });

    const edges = await listTrackerIssueLinkEdges({
      issueKeys: ['A-1', 'B-2'],
      issueTracker: { listIssueLinks },
      organizationId: ORG,
    });

    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ id: 'shared', fromIssueKey: 'A-1', toIssueKey: 'B-2' });
  });

  it('serves cached per-issue links on the second batch call', async () => {
    const listIssueLinks = vi.fn((key: string) =>
      Promise.resolve([
        {
          id: `link-${key}`,
          direction: 'outward' as const,
          relationship: 'relates' as const,
          linkedIssueKey: 'C-3',
        },
      ])
    );

    const first = await listTrackerIssueLinkEdges({
      issueKeys: ['A-1', 'B-2'],
      issueTracker: { listIssueLinks },
      organizationId: ORG,
    });
    expect(listIssueLinks).toHaveBeenCalledTimes(2);
    expect(first).toHaveLength(2);

    listIssueLinks.mockClear();
    const second = await listTrackerIssueLinkEdges({
      issueKeys: ['A-1', 'B-2'],
      issueTracker: { listIssueLinks },
      organizationId: ORG,
    });
    expect(listIssueLinks).not.toHaveBeenCalled();
    expect(second).toHaveLength(2);

    // Sanity: cache keys exist in the shared apiCache.
    expect(apiCache.get(`tracker:issue-links:${ORG}:A-1`)).not.toBeNull();
  });

  it('fetches only cache misses when the batch grows', async () => {
    const listIssueLinks = vi.fn((key: string) =>
      Promise.resolve([
        {
          id: `link-${key}`,
          direction: 'outward' as const,
          relationship: 'relates' as const,
          linkedIssueKey: 'Z-9',
        },
      ])
    );

    await listTrackerIssueLinkEdges({
      issueKeys: ['A-1'],
      issueTracker: { listIssueLinks },
      organizationId: ORG,
    });
    listIssueLinks.mockClear();

    await listTrackerIssueLinkEdges({
      issueKeys: ['A-1', 'B-2'],
      issueTracker: { listIssueLinks },
      organizationId: ORG,
    });
    expect(listIssueLinks).toHaveBeenCalledTimes(1);
    expect(listIssueLinks).toHaveBeenCalledWith('B-2');
  });
});
