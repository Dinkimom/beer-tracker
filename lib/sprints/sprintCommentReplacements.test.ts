import type { QueryResult } from 'pg';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';

import {
  applyPendingCommentReplacements,
  deletePendingCommentReplacements,
  insertPendingCommentReplacements,
} from './sprintCommentReplacements';

vi.mock('@/lib/db', () => ({ query: vi.fn() }));
vi.mock('./ensurePlannerCommentImages', () => ({
  ensurePlannerCommentImagesSchema: vi.fn().mockResolvedValue(undefined),
}));

const mockedQuery = vi.mocked(query);

function result(rowCount: number): QueryResult {
  return { rowCount, rows: [] } as unknown as QueryResult;
}

describe('sprintCommentReplacements', () => {
  beforeEach(() => {
    mockedQuery.mockReset();
  });

  it('copies only updateNote / deleteNote ops and returns ids of the copies that were created', async () => {
    mockedQuery.mockResolvedValueOnce(result(1)).mockResolvedValueOnce(result(0));
    const ids = await insertPendingCommentReplacements({
      actorUserId: 'owner',
      clientBrand: 'cursor',
      expiresAt: new Date('2026-10-26T00:00:00.000Z'),
      ops: [
        { commentId: 'n1', op: 'updateNote', text: 'new text' },
        { op: 'upsertPosition' } as never,
        { commentId: 'n2', op: 'deleteNote' },
      ],
      proposalId: 'p1',
      sprintId: 7,
    });
    expect(mockedQuery).toHaveBeenCalledTimes(2);
    expect(ids).toHaveLength(1);
    const [sql, updateParams] = mockedQuery.mock.calls[0]!;
    // Копия — pending, ссылается на оригинал и берётся только из живой подтверждённой заметки.
    expect(sql).toContain('replaces_comment_id');
    expect(sql).toContain('o.deleted_at IS NULL AND o.pending_approval = FALSE');
    expect(updateParams).toEqual([
      ids[0],
      7,
      'cursor',
      'owner',
      '2026-10-26T00:00:00.000Z',
      'p1',
      null,
      'new text',
      false,
      null,
      false,
      null,
      null,
      null,
      null,
      false,
      null,
      'update',
      'n1',
    ]);
    const deleteParams = mockedQuery.mock.calls[1]![1] as unknown[];
    expect(deleteParams.slice(-2)).toEqual(['delete', 'n2']);
  });

  it('applies the chosen copies (single ✓) or all copies of the draft owner', async () => {
    mockedQuery.mockResolvedValue(result(1));
    await applyPendingCommentReplacements({ commentIds: ['c1'], ownerId: 'owner', sprintId: 7 });
    await applyPendingCommentReplacements({ ownerId: 'owner', sprintId: 7 });
    expect(mockedQuery.mock.calls[0]![1]).toEqual([7, ['c1'], 'owner']);
    expect(mockedQuery.mock.calls[1]![1]).toEqual([7, null, 'owner']);
    const sql = String(mockedQuery.mock.calls[0]![0]);
    // Правка → в оригинал, удаление → soft delete оригинала, копии убираются.
    expect(sql).toContain("d.replace_action = 'update'");
    expect(sql).toContain("d.replace_action = 'delete'");
    expect(sql).toContain('SET deleted_at = CURRENT_TIMESTAMP');
    expect(sql).toMatch(/DELETE FROM comments c USING drafts d WHERE c\.id = d\.id/);
    expect(sql).toContain('LOWER(d.created_by::text) = LOWER($3)');
  });

  it('drops the owner copies once apply_plan_patch applied the note ops itself', async () => {
    mockedQuery.mockResolvedValue(result(2));
    await deletePendingCommentReplacements({ ownerId: 'owner', sprintId: 7 });
    expect(String(mockedQuery.mock.calls[0]![0])).toMatch(/^DELETE FROM comments d WHERE/);
    expect(mockedQuery.mock.calls[0]![1]).toEqual([7, null, 'owner']);
  });
});
