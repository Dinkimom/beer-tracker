import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createIssueLinkWriteThrough,
  deleteIssueLinkWriteThrough,
  loadIssueLinksWithCacheRefresh,
} from './issueLinksRouteHelpers';

vi.mock('./issueLinksRepository', () => ({
  deleteIssueLinkByTrackerId: vi.fn(),
  issueLinkRowToDto: (row: { trackerLinkId: string }) => ({
    id: row.trackerLinkId,
    direction: 'outward',
    relationship: 'relates',
    linkedIssueKey: 'BT-2',
    linkedSummary: null,
    linkedStatus: null,
  }),
  listIssueLinksForIssue: vi.fn(),
  replaceIssueLinksForIssue: vi.fn(),
  upsertIssueLink: vi.fn(),
}));

import {
  deleteIssueLinkByTrackerId,
  listIssueLinksForIssue,
  replaceIssueLinksForIssue,
  upsertIssueLink,
} from './issueLinksRepository';

describe('issueLinksRouteHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes from Tracker and replaces cache', async () => {
    const fresh = [
      {
        id: '1',
        direction: 'outward' as const,
        relationship: 'relates' as const,
        linkedIssueKey: 'BT-2',
      },
    ];
    const listIssueLinks = vi.fn().mockResolvedValueOnce(fresh);
    vi.mocked(replaceIssueLinksForIssue).mockResolvedValueOnce([
      {
        trackerLinkId: '1',
        issueKey: 'BT-1',
        linkedIssueKey: 'BT-2',
        relationship: 'relates',
        direction: 'outward',
        linkedSummary: null,
        linkedStatus: null,
        syncedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const result = await loadIssueLinksWithCacheRefresh({
      organizationId: 'org-1',
      issueKey: 'BT-1',
      issueTracker: { listIssueLinks },
    });

    expect(listIssueLinks).toHaveBeenCalledWith('BT-1');
    expect(replaceIssueLinksForIssue).toHaveBeenCalledWith({
      organizationId: 'org-1',
      issueKey: 'BT-1',
      links: fresh,
    });
    expect(result.fromCache).toBe(false);
    expect(result.links).toHaveLength(1);
  });

  it('falls back to stale cache when Tracker fails', async () => {
    const listIssueLinks = vi.fn().mockRejectedValueOnce(new Error('tracker down'));
    vi.mocked(listIssueLinksForIssue).mockResolvedValueOnce([
      {
        trackerLinkId: '9',
        issueKey: 'BT-1',
        linkedIssueKey: 'BT-9',
        relationship: 'blocks',
        direction: 'outward',
        linkedSummary: null,
        linkedStatus: null,
        syncedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const result = await loadIssueLinksWithCacheRefresh({
      organizationId: 'org-1',
      issueKey: 'BT-1',
      issueTracker: { listIssueLinks },
    });

    expect(result.fromCache).toBe(true);
    expect(result.links[0]?.id).toBe('9');
    expect(replaceIssueLinksForIssue).not.toHaveBeenCalled();
  });

  it('writes through create then upserts cache', async () => {
    const created = {
      id: '7',
      direction: 'outward' as const,
      relationship: 'relates' as const,
      linkedIssueKey: 'BT-2',
    };
    const createIssueLink = vi.fn().mockResolvedValueOnce(created);
    vi.mocked(upsertIssueLink).mockResolvedValueOnce({
      trackerLinkId: '7',
      issueKey: 'BT-1',
      linkedIssueKey: 'BT-2',
      relationship: 'relates',
      direction: 'outward',
      linkedSummary: null,
      linkedStatus: null,
      syncedAt: '2026-01-01T00:00:00.000Z',
    });

    const link = await createIssueLinkWriteThrough({
      organizationId: 'org-1',
      issueKey: 'BT-1',
      issueTracker: { createIssueLink },
      payload: { relationship: 'relates', targetIssueKey: 'BT-2' },
    });

    expect(createIssueLink).toHaveBeenCalledWith('BT-1', {
      relationship: 'relates',
      targetIssueKey: 'BT-2',
    });
    expect(upsertIssueLink).toHaveBeenCalled();
    expect(link.id).toBe('7');
  });

  it('writes through delete then removes cache row', async () => {
    const deleteIssueLink = vi.fn().mockResolvedValueOnce(undefined);
    await deleteIssueLinkWriteThrough({
      organizationId: 'org-1',
      issueKey: 'BT-1',
      issueTracker: { deleteIssueLink },
      trackerLinkId: '7',
    });
    expect(deleteIssueLink).toHaveBeenCalledWith('BT-1', '7');
    expect(deleteIssueLinkByTrackerId).toHaveBeenCalledWith({
      organizationId: 'org-1',
      issueKey: 'BT-1',
      trackerLinkId: '7',
    });
  });
});
