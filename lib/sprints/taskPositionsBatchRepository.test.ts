import type { QueryResult } from 'pg';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query, runBeerTrackerTransaction } from '@/lib/db';

import { persistBatchPositionsTransaction } from './taskPositionsBatchRepository';

const EMPTY_RESULT = { rowCount: 0, rows: [] } as unknown as QueryResult;

const txCalls: Array<{ params?: unknown[]; sql: string }> = [];

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  runBeerTrackerTransaction: vi.fn(),
}));

function position(taskId: string, segments?: Array<{ duration: number; startDay: number; startPart: number }>) {
  return {
    assigneeId: 'u1',
    duration: 2,
    segments,
    startDay: 0,
    startPart: 0,
    taskId,
  };
}

describe('persistBatchPositionsTransaction', () => {
  beforeEach(() => {
    txCalls.length = 0;
    vi.mocked(query).mockReset();
    vi.mocked(runBeerTrackerTransaction).mockReset();
    vi.mocked(runBeerTrackerTransaction).mockImplementation((fn) =>
      fn((sql, params) => {
        txCalls.push({ params: params as unknown[] | undefined, sql });
        return Promise.resolve(EMPTY_RESULT);
      })
    );
  });

  it('runs every statement (including segment replacement) on the transaction client', async () => {
    await persistBatchPositionsTransaction({
      organizationId: 'org',
      positions: [
        position('A-1', [
          { duration: 1, startDay: 0, startPart: 0 },
          { duration: 1, startDay: 2, startPart: 1 },
        ]),
        position('A-2'),
        position('A-3', []),
      ],
      sprintId: 5,
    });

    expect(runBeerTrackerTransaction).toHaveBeenCalledTimes(1);
    expect(query).not.toHaveBeenCalled();
    const sqls = txCalls.map((c) => c.sql);
    expect(sqls[0]).toMatch(/^DELETE FROM task_positions/);
    expect(txCalls[0]!.params).toEqual([5, 'A-1', 'A-2', 'A-3']);
    expect(sqls[1]).toMatch(/INSERT INTO task_positions/);
    // A-1: delete + 2 upserts; A-2: segments untouched; A-3: delete only
    const segmentDeletes = txCalls.filter((c) => c.sql.startsWith('DELETE FROM task_position_segments'));
    expect(segmentDeletes.map((c) => c.params)).toEqual([
      [5, 'A-1'],
      [5, 'A-3'],
    ]);
    const segmentInserts = txCalls.filter((c) => c.sql.includes('INSERT INTO task_position_segments'));
    expect(segmentInserts.map((c) => c.params)).toEqual([
      ['org', 5, 'A-1', 0, 0, 0, 1],
      ['org', 5, 'A-1', 1, 2, 1, 1],
    ]);
    expect(sqls.some((s) => /^(BEGIN|COMMIT|ROLLBACK)/.test(s))).toBe(false);
  });

  it('propagates errors raised inside the transaction', async () => {
    vi.mocked(runBeerTrackerTransaction).mockImplementation((fn) =>
      fn((sql) =>
        sql.includes('task_position_segments') ? Promise.reject(new Error('segments failed')) : Promise.resolve(EMPTY_RESULT)
      )
    );
    await expect(
      persistBatchPositionsTransaction({
        organizationId: 'org',
        positions: [position('A-1', [])],
        sprintId: 5,
      })
    ).rejects.toThrow('segments failed');
    expect(query).not.toHaveBeenCalled();
  });
});
