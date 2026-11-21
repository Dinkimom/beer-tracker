import { beforeEach, describe, expect, it, vi } from 'vitest';

import { refreshIssueFieldEvents, upsertIssueChangelogCacheBatchForOrg } from './issueChangelogWrite';
import { syncIssueChangelogsFromTrackerForKeys } from './syncIssueChangelogsFromTracker';

vi.mock('./issueChangelogWrite', () => ({
  refreshIssueFieldEvents: vi.fn(() => Promise.resolve()),
  upsertIssueChangelogCacheBatchForOrg: vi.fn((_org: string, rows: unknown[]) => Promise.resolve(rows.length)),
}));

const issueTracker = {
  getIssuesChangelogBatch: vi.fn(() => Promise.resolve({})),
} as never;

describe('syncIssueChangelogsFromTrackerForKeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes issue_field_events once after the cache is written', async () => {
    const upserted = await syncIssueChangelogsFromTrackerForKeys('org-1', ['BT-1', 'BT-2'], issueTracker);
    expect(upserted).toBe(2);
    expect(upsertIssueChangelogCacheBatchForOrg).toHaveBeenCalledTimes(1);
    expect(refreshIssueFieldEvents).toHaveBeenCalledTimes(1);
  });

  it('skips the refresh when nothing was synced', async () => {
    await syncIssueChangelogsFromTrackerForKeys('org-1', ['  '], issueTracker);
    expect(refreshIssueFieldEvents).not.toHaveBeenCalled();
  });

  it('keeps the sync result when the refresh fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(refreshIssueFieldEvents).mockRejectedValueOnce(new Error('lock timeout'));
    await expect(syncIssueChangelogsFromTrackerForKeys('org-1', ['BT-3'], issueTracker)).resolves.toBe(1);
  });
});
