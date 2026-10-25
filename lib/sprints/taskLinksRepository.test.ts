import type { QueryResult } from 'pg';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query, runBeerTrackerTransaction } from '@/lib/db';

import { persistBatchTaskLinks } from './taskLinksRepository';

const EMPTY_RESULT = { rowCount: 0, rows: [] } as unknown as QueryResult;

const txCalls: Array<{ params?: unknown[]; sql: string }> = [];

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  runBeerTrackerTransaction: vi.fn(),
}));

describe('persistBatchTaskLinks', () => {
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

  it('runs delete and insert on the transaction client, never on the pool', async () => {
    const count = await persistBatchTaskLinks({
      links: [
        { fromTaskId: 'A-1', id: 'l1', toTaskId: 'A-2' },
        { fromAnchor: 'right', fromTaskId: 'A-2', id: 'l2', toTaskId: 'A-3' },
      ],
      organizationId: 'org',
      sprintId: 7,
    });

    expect(count).toBe(2);
    expect(runBeerTrackerTransaction).toHaveBeenCalledTimes(1);
    expect(query).not.toHaveBeenCalled();
    expect(txCalls).toHaveLength(2);
    expect(txCalls[0]!.sql).toMatch(/^DELETE FROM task_links/);
    expect(txCalls[0]!.params).toEqual([7, 'l1', 'l2']);
    expect(txCalls[1]!.sql).toMatch(/INSERT INTO task_links/);
    expect(txCalls.some((c) => /^(BEGIN|COMMIT|ROLLBACK)/.test(c.sql))).toBe(false);
  });

  it('propagates errors from the transaction (rollback is owned by runBeerTrackerTransaction)', async () => {
    vi.mocked(runBeerTrackerTransaction).mockImplementation((fn) =>
      fn((sql) =>
        sql.includes('INSERT') ? Promise.reject(new Error('boom')) : Promise.resolve(EMPTY_RESULT)
      )
    );
    await expect(
      persistBatchTaskLinks({
        links: [{ fromTaskId: 'A-1', id: 'l1', toTaskId: 'A-2' }],
        organizationId: 'org',
        sprintId: 7,
      })
    ).rejects.toThrow('boom');
    expect(query).not.toHaveBeenCalled();
  });

  it('does nothing for an empty batch', async () => {
    await expect(
      persistBatchTaskLinks({ links: [], organizationId: 'org', sprintId: 7 })
    ).resolves.toBe(0);
    expect(txCalls).toHaveLength(0);
    expect(query).not.toHaveBeenCalled();
  });
});
