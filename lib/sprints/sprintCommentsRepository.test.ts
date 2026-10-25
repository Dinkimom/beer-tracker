import type { QueryResult } from 'pg';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query, runBeerTrackerTransaction } from '@/lib/db';

import {
  deleteSprintComment,
  deleteSprintCommentLinksSql,
  listSprintComments,
  softDeleteSprintCommentSql,
} from './sprintCommentsRepository';
import {
  confirmPendingSprintComments,
  deleteAllPendingSprintComments,
} from './sprintPendingCommentsRepository';

vi.mock('@/lib/db', () => ({ query: vi.fn(), runBeerTrackerTransaction: vi.fn() }));
vi.mock('./ensurePlannerCommentImages', () => ({
  ensurePlannerCommentImagesSchema: vi.fn().mockResolvedValue(undefined),
}));

const mockedQuery = vi.mocked(query);
const NOTE = '11111111-1111-4111-8111-111111111111';

function result(rowCount: number, rows: unknown[] = []): QueryResult {
  return { rowCount, rows } as unknown as QueryResult;
}

describe('listSprintComments', () => {
  beforeEach(() => {
    mockedQuery.mockReset();
    mockedQuery.mockResolvedValue(result(0));
  });

  it('purges expired agent drafts before reading', async () => {
    await listSprintComments({ organizationId: 'org', sprintId: 7, viewerUserId: 'owner' });
    const [purgeSql, purgeParams] = mockedQuery.mock.calls[0]!;
    expect(purgeSql).toMatch(/^DELETE FROM comments/);
    expect(purgeSql).toContain('pending_approval = TRUE');
    expect(purgeSql).toContain('pending_approval_expires_at < CURRENT_TIMESTAMP');
    expect(purgeParams).toEqual([7]);
  });

  it('shows pending drafts only to their creator', async () => {
    await listSprintComments({ organizationId: 'org', sprintId: 7, viewerUserId: 'Owner' });
    const [sql, params] = mockedQuery.mock.calls[1]!;
    expect(sql).toContain('deleted_at IS NULL');
    expect(sql).toContain('(pending_approval = FALSE OR LOWER(created_by::text) = LOWER($2))');
    expect(params).toEqual([7, 'Owner']);
  });

  it('hides every draft when there is no viewer', async () => {
    await listSprintComments({ organizationId: 'org', sprintId: 7 });
    expect(mockedQuery.mock.calls[1]![1]).toEqual([7, '']);
  });
});

describe('pending approval', () => {
  beforeEach(() => {
    mockedQuery.mockReset();
    mockedQuery.mockResolvedValue(result(1));
  });

  it('confirms only the owner drafts when ownerId is given', async () => {
    await confirmPendingSprintComments({ commentIds: [NOTE], ownerId: 'owner', sprintId: 7 });
    await confirmPendingSprintComments({ commentIds: [NOTE], sprintId: 7 });
    expect(String(mockedQuery.mock.calls[0]![0])).toContain(
      '($3::text IS NULL OR LOWER(created_by::text) = LOWER($3))'
    );
    expect(mockedQuery.mock.calls[0]![1]).toEqual([7, [NOTE], 'owner']);
    expect(mockedQuery.mock.calls[1]![1]).toEqual([7, [NOTE], null]);
  });

  it('rejects all drafts (and replacement copies) of the owner only', async () => {
    await deleteAllPendingSprintComments({ ownerId: 'owner', sprintId: 7 });
    const [sql, params] = mockedQuery.mock.calls[0]!;
    expect(sql).toContain('pending_approval = TRUE');
    expect(sql).toContain('LOWER(created_by::text) = LOWER($2)');
    expect(params).toEqual([7, 'owner']);
  });
});

describe('deleteSprintComment', () => {
  const txCalls: Array<{ params?: unknown[]; sql: string }> = [];

  function useTransaction(deletedRows: number): void {
    vi.mocked(runBeerTrackerTransaction).mockImplementation((fn) =>
      fn((sql, params) => {
        txCalls.push({ params: params as unknown[] | undefined, sql });
        return Promise.resolve(result(sql.startsWith('UPDATE comments') ? deletedRows : 0));
      })
    );
  }

  beforeEach(() => {
    txCalls.length = 0;
    mockedQuery.mockReset();
    vi.mocked(runBeerTrackerTransaction).mockReset();
  });

  it('soft-deletes the note and its arrows (both endpoint spellings) in one transaction', async () => {
    useTransaction(1);
    await expect(
      deleteSprintComment({ actorUserId: 'u1', commentId: NOTE, organizationId: 'org', sprintId: 7 })
    ).resolves.toEqual({ ok: true });
    expect(runBeerTrackerTransaction).toHaveBeenCalledTimes(1);
    expect(mockedQuery).not.toHaveBeenCalled();
    expect(txCalls).toEqual([
      { params: [7, NOTE, 'u1'], sql: softDeleteSprintCommentSql() },
      { params: [7, [NOTE, `comment:${NOTE}`]], sql: deleteSprintCommentLinksSql() },
    ]);
  });

  it('leaves links alone when the note is missing or already deleted', async () => {
    useTransaction(0);
    await expect(
      deleteSprintComment({ commentId: NOTE, organizationId: 'org', sprintId: 7 })
    ).resolves.toEqual({ ok: false });
    expect(txCalls).toHaveLength(1);
    expect(txCalls[0]!.params).toEqual([7, NOTE, null]);
  });

  it('lets only the author delete an agent draft (pending_approval)', () => {
    expect(softDeleteSprintCommentSql()).toContain(
      'AND (pending_approval = FALSE OR LOWER(created_by::text) = LOWER($3::text))'
    );
  });
});
