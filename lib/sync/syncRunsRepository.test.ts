import { DatabaseError } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';

import {
  failInterruptedRunningSyncRuns,
  failRunningSyncRunForBullJob,
  INTERRUPTED_SYNC_RUN_MESSAGE,
  tryBeginSyncRun,
} from './syncRunsRepository';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

function postgresUniqueViolation(): DatabaseError {
  const err = new DatabaseError('duplicate key value violates unique constraint', 91, 'error');
  err.code = '23505';
  return err;
}

describe('tryBeginSyncRun', () => {
  const orgId = '00000000-0000-4000-8000-0000000000aa';

  beforeEach(() => {
    vi.mocked(query).mockReset();
  });

  it('returns syncRunId on successful insert', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      rows: [{ id: '00000000-0000-4000-8000-0000000000bb' }],
    } as never);

    const r = await tryBeginSyncRun({
      initialStats: { mode: 'incremental' },
      jobType: 'incremental',
      organizationId: orgId,
    });

    expect(r).toEqual({
      ok: true,
      syncRunId: '00000000-0000-4000-8000-0000000000bb',
    });
    expect(vi.mocked(query)).toHaveBeenCalledTimes(1);
    const [sql, params] = vi.mocked(query).mock.calls[0]!;
    expect(String(sql)).toContain('INSERT INTO sync_runs');
    expect(params).toEqual([
      orgId,
      'incremental',
      JSON.stringify({ mode: 'incremental' }),
    ]);
  });

  it('returns concurrent_sync when unique index on running org fires (23505)', async () => {
    vi.mocked(query).mockRejectedValueOnce(postgresUniqueViolation());

    const r = await tryBeginSyncRun({
      initialStats: { mode: 'initial_full' },
      jobType: 'initial_full',
      organizationId: orgId,
    });

    expect(r).toEqual({ ok: false, reason: 'concurrent_sync' });
  });

  it('fails every running row when the worker restarts', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rowCount: 1, rows: [] } as never);
    await expect(failInterruptedRunningSyncRuns()).resolves.toBe(1);
    const [sql, params] = vi.mocked(query).mock.calls[0]!;
    expect(String(sql)).toContain("status = 'running'");
    expect(params).toEqual([INTERRUPTED_SYNC_RUN_MESSAGE]);
  });

  it('fails only the running row of the same BullMQ job', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rowCount: 1, rows: [] } as never);
    await expect(failRunningSyncRunForBullJob(orgId, 'full-rescan-1')).resolves.toBe(true);
    const [sql, params] = vi.mocked(query).mock.calls[0]!;
    expect(String(sql)).toContain("stats->>'bull_job_id'");
    expect(params).toEqual([orgId, 'full-rescan-1', INTERRUPTED_SYNC_RUN_MESSAGE]);
  });

  it('rethrows non-unique violations', async () => {
    const err = new Error('connection reset');
    vi.mocked(query).mockRejectedValueOnce(err);

    await expect(
      tryBeginSyncRun({
        initialStats: {},
        jobType: 'incremental',
        organizationId: orgId,
      })
    ).rejects.toBe(err);
  });
});
