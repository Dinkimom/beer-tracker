import type { QueryResult } from 'pg';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query, runBeerTrackerTransaction } from '@/lib/db';

import { moveSprintCommentLinksSql, moveSprintCommentsToSprint } from './sprintCommentsMoveRepository';
import { deleteSprintCommentLinksSql } from './sprintCommentsRepository';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  runBeerTrackerTransaction: vi.fn(),
}));

const NOTE_A = '11111111-1111-4111-8111-111111111111';
const NOTE_B = '22222222-2222-4222-8222-222222222222';

const txCalls: Array<{ params?: unknown[]; sql: string }> = [];

function useTransaction(movedIds: string[]): void {
  vi.mocked(runBeerTrackerTransaction).mockImplementation((fn) =>
    fn((sql, params) => {
      txCalls.push({ params: params as unknown[] | undefined, sql });
      const rows = sql.startsWith('UPDATE comments') ? movedIds.map((id) => ({ id })) : [];
      return Promise.resolve({ rowCount: rows.length, rows } as unknown as QueryResult);
    })
  );
}

describe('moveSprintCommentsToSprint', () => {
  beforeEach(() => {
    txCalls.length = 0;
    vi.mocked(query).mockReset();
    vi.mocked(runBeerTrackerTransaction).mockReset();
  });

  it('moves notes and their arrows in one transaction and returns the real count', async () => {
    useTransaction([NOTE_A]);
    const moved = await moveSprintCommentsToSprint({
      commentIds: [NOTE_A, NOTE_B],
      fromSprintId: 12,
      organizationId: 'org',
      toSprintId: 44,
    });

    expect(moved).toBe(1);
    expect(runBeerTrackerTransaction).toHaveBeenCalledTimes(1);
    expect(query).not.toHaveBeenCalled();
    expect(txCalls.map((c) => c.sql)).toEqual([
      expect.stringMatching(/^UPDATE comments SET sprint_id = \$2 .* RETURNING id$/),
      moveSprintCommentLinksSql(),
      deleteSprintCommentLinksSql(),
    ]);
    expect(txCalls[0]!.params).toEqual([12, 44, [NOTE_A, NOTE_B]]);
    // Only the note that actually moved; both endpoint spellings.
    expect(txCalls[1]!.params).toEqual([12, 44, [NOTE_A, `comment:${NOTE_A}`]]);
    expect(txCalls[2]!.params).toEqual([12, [NOTE_A, `comment:${NOTE_A}`]]);
  });

  it('returns 0 and leaves links alone when no note was in the source sprint', async () => {
    useTransaction([]);
    await expect(
      moveSprintCommentsToSprint({
        commentIds: [NOTE_A],
        fromSprintId: 12,
        organizationId: 'org',
        toSprintId: 44,
      })
    ).resolves.toBe(0);
    expect(txCalls).toHaveLength(1);
  });

  it('skips the database for an empty list or the same sprint', async () => {
    useTransaction([NOTE_A]);
    await expect(
      moveSprintCommentsToSprint({ commentIds: [], fromSprintId: 1, organizationId: 'o', toSprintId: 2 })
    ).resolves.toBe(0);
    await expect(
      moveSprintCommentsToSprint({ commentIds: [NOTE_A], fromSprintId: 2, organizationId: 'o', toSprintId: 2 })
    ).resolves.toBe(0);
    expect(runBeerTrackerTransaction).not.toHaveBeenCalled();
  });

  it('link move skips pairs that already exist in the target sprint', () => {
    const sql = moveSprintCommentLinksSql();
    expect(sql).toContain('UPDATE task_links AS l SET sprint_id = $2');
    expect(sql).toContain('NOT EXISTS');
    expect(sql).toContain('d.sprint_id = $2');
  });
});
