import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';
import { wrapIssueSnapshotForStorage } from '@/lib/issueTrackerProvider/snapshotEnvelope';

import { queryIssueSnapshotsMatchingSprint } from './issueSnapshotSprintRead';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  qualifyBeerTrackerTables: (sql: string) => sql,
}));

const orgId = '11111111-1111-4111-8111-111111111111';

describe('queryIssueSnapshotsMatchingSprint', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
  });
  it('returns empty when sprint id and name are blank', async () => {
    await expect(
      queryIssueSnapshotsMatchingSprint(orgId, { sprintName: '  ' })
    ).resolves.toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });

  it('reads beer_tracker.issue_snapshots, not overseer', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [
        {
          issue_key: 'PROJ-1',
          payload: wrapIssueSnapshotForStorage('jira', {
            id: '10001',
            key: 'PROJ-1',
            self: 'https://jira.example.com/browse/PROJ-1',
            summary: 'Book a table',
          }),
        },
      ],
    } as never);

    const issues = await queryIssueSnapshotsMatchingSprint(orgId, {
      functionalTeamExact: 'Booking',
      sprintId: '78804',
      sprintName: '',
    });

    const [sql, params] = vi.mocked(query).mock.calls[0]!;
    expect(sql).toMatch(/FROM\s+issue_snapshots/i);
    expect(sql).not.toMatch(/overseer/i);
    expect(sql).toContain("payload->'payload'");
    expect(params).toEqual([orgId, '78804', '', 'Booking']);
    expect(issues).toEqual([
      expect.objectContaining({ key: 'PROJ-1', summary: 'Book a table' }),
    ]);
  });
});
