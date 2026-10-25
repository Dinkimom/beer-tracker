import type { SprintPlanPatchOp } from './sprintPlanPatchTypes';
import type { BeerTrackerTransactionQuery } from '@/lib/db';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteSprintGoal } from '@/lib/sprintGoals';

import { applySprintPlanPatchOps } from './sprintPlanPatchApply';
import { syncUpsertPositionToTracker } from './sprintPlanPatchTrackerSync';
import { upsertTaskPositionRecord } from './taskPositionsRepository';

vi.mock('@/lib/sprintGoals', () => ({
  deleteSprintGoal: vi.fn(),
  insertSprintGoal: vi.fn(),
  updateSprintGoal: vi.fn(),
}));
vi.mock('./taskPositionsRepository', () => ({
  deleteTaskPosition: vi.fn(),
  replaceTaskPositionSegments: vi.fn(),
  upsertTaskPositionRecord: vi.fn(),
}));
vi.mock('./sprintPlanPatchTrackerSync', () => ({ syncUpsertPositionToTracker: vi.fn() }));
vi.mock('./sprintCommentsRepository', () => ({
  deleteSprintComment: vi.fn(),
  insertSprintComment: vi.fn(),
  listSprintCommentIds: vi.fn(() => Promise.resolve([])),
  updateSprintComment: vi.fn(),
}));

const upsertPosition = vi.mocked(upsertTaskPositionRecord);
const deleteGoal = vi.mocked(deleteSprintGoal);
const trackerSync = vi.mocked(syncUpsertPositionToTracker);

const position: SprintPlanPatchOp = {
  assigneeId: 'dev-1',
  duration: 2,
  op: 'upsertPosition',
  startDay: 0,
  startPart: 0,
  syncToTracker: true,
  taskId: 'BT-1',
};
const missingGoal: SprintPlanPatchOp = { id: 'goal-x', op: 'deleteGoal' };

function fakeTx() {
  const statements: string[] = [];
  const tx = vi.fn((sql: string) => {
    statements.push(sql);
    return Promise.resolve({ rowCount: 0, rows: [] });
  }) as unknown as BeerTrackerTransactionQuery;
  return { statements, tx };
}

function run(ops: SprintPlanPatchOp[], onError: 'continue' | 'stop', tx: BeerTrackerTransactionQuery) {
  return applySprintPlanPatchOps({
    actorUserId: 'user-1',
    onError,
    ops,
    organizationId: 'org-1',
    sprintId: 7,
    tx,
  });
}

describe('applySprintPlanPatchOps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertPosition.mockResolvedValue({ rows: [] });
    deleteGoal.mockResolvedValue(false);
  });

  it('writes every op through the transaction, each in its own savepoint', async () => {
    const { statements, tx } = fakeTx();
    const result = await run([position], 'stop', tx);
    expect(result.error).toBeUndefined();
    expect(upsertPosition.mock.calls[0]?.[1]).toBe(tx);
    expect(statements).toEqual(['SAVEPOINT plan_patch_op', 'RELEASE SAVEPOINT plan_patch_op']);
  });

  it('defers tracker sync: it is requested, not run inside the transaction', async () => {
    const { tx } = fakeTx();
    const result = await run([position], 'stop', tx);
    expect(trackerSync).not.toHaveBeenCalled();
    expect(result.trackerSyncs).toEqual([{ assigneeId: 'dev-1', index: 0, taskId: 'BT-1' }]);
  });

  it('stops at the first failure and reports that nothing was applied', async () => {
    const { statements, tx } = fakeTx();
    const result = await run([missingGoal, position], 'stop', tx);
    expect(result.applied).toHaveLength(1);
    expect(result.error).toMatch(/stopped at op\[0\] deleteGoal.*rolled back/);
    expect(statements).toContain('ROLLBACK TO SAVEPOINT plan_patch_op');
    expect(upsertPosition).not.toHaveBeenCalled();
  });

  it('with continue rolls back only the failed op and applies the rest', async () => {
    const { tx } = fakeTx();
    const result = await run([missingGoal, position], 'continue', tx);
    expect(result.applied.map((row) => row.ok)).toEqual([false, true]);
    expect(result.error).toBe('continued with 1 failed op(s)');
    expect(upsertPosition).toHaveBeenCalledTimes(1);
  });
});
