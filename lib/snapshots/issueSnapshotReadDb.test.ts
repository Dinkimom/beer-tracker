import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';
import { wrapIssueSnapshotForStorage } from '@/lib/issueTrackerProvider/snapshotEnvelope';

import {
  findIssueSnapshotByKey,
  findIssueSnapshotMetaByKeys,
  queryIssueSnapshotsByQueue,
} from './issueSnapshotReadDb';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  qualifyBeerTrackerTables: (sql: string) => sql,
}));

const orgId = '11111111-1111-4111-8111-111111111111';

describe('issueSnapshotReadDb', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
  });

  it('findIssueSnapshotByKey reads issue_snapshots, not overseer', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [
        {
          issue_key: 'BT-100',
          payload: wrapIssueSnapshotForStorage('yandex-tracker', {
            id: '1',
            key: 'BT-100',
            self: '',
            summary: 'Fix tooltip',
          }),
        },
      ],
    } as never);

    const issue = await findIssueSnapshotByKey(orgId, 'BT-100');
    const [sql] = vi.mocked(query).mock.calls[0]!;

    expect(sql).toMatch(/FROM\s+issue_snapshots/i);
    expect(sql).not.toMatch(/overseer/i);
    expect(issue).toEqual(expect.objectContaining({ key: 'BT-100', summary: 'Fix tooltip' }));
  });

  it('queryIssueSnapshotsByQueue scopes by organization and queue', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);

    await queryIssueSnapshotsByQueue(orgId, 'BT');
    const [sql, params] = vi.mocked(query).mock.calls[0]!;

    expect(sql).toMatch(/FROM\s+issue_snapshots/i);
    expect(sql).not.toMatch(/overseer/i);
    expect(sql).toContain("payload->'payload'");
    expect(params).toEqual([orgId, 'BT']);
  });

  it('findIssueSnapshotMetaByKeys batches keys', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);

    await findIssueSnapshotMetaByKeys(orgId, ['A-1', 'A-2']);
    const [sql, params] = vi.mocked(query).mock.calls[0]!;

    expect(sql).toMatch(/FROM\s+issue_snapshots/i);
    expect(params).toEqual([orgId, ['A-1', 'A-2']]);
  });
});
