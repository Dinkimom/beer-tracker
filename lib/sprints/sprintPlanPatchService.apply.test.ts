import type * as ApplyModule from './sprintPlanPatchApply';
import type * as TokenModule from './sprintPlanPatchToken';
import type { SprintPlanPatchOp } from './sprintPlanPatchTypes';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runBeerTrackerTransaction } from '@/lib/db';

import { claimPlanPatchApplyToken } from './sprintPlanPatchAppliedTokenRepository';
import { applySprintPlanPatchOps, runPlanPatchTrackerSyncs } from './sprintPlanPatchApply';
import { confirmProposedCreateNotes } from './sprintPlanPatchDraftNotes';
import { applySprintPlanPatch } from './sprintPlanPatchService';

vi.mock('@/lib/db', () => ({ runBeerTrackerTransaction: vi.fn() }));
vi.mock('@/lib/realtime/notifySprintRealtime', () => ({ notifySprintRealtime: vi.fn() }));
vi.mock('@/lib/sprints/loadSprintContextForOrganization', () => ({
  loadSprintContextForOrganization: vi.fn(() => Promise.reject(new Error('not needed'))),
}));
vi.mock('@/lib/sprints/sprintCommentReplacements', () => ({
  deletePendingCommentReplacements: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/sprints/sprintPlanPatchGoalPreviewRepository', () => ({
  deletePlanPatchGoalPreviewsByProposal: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/sprints/sprintPlanPatchPositionPreviewRepository', () => ({
  deletePlanPatchPositionPreviewsByProposal: vi.fn(() => Promise.resolve()),
}));
vi.mock('./sprintPlanPatchAppliedTokenRepository', () => ({
  claimPlanPatchApplyToken: vi.fn(),
}));
vi.mock('./sprintPlanPatchDraftNotes', () => ({ confirmProposedCreateNotes: vi.fn() }));
vi.mock('./sprintPlanPatchToken', async (importOriginal) => ({
  ...(await importOriginal<typeof TokenModule>()),
  verifySprintPlanPatchToken: vi.fn(() => ({ draftNoteIds: ['note-1'], exp: 2_000_000_000, ok: true })),
}));
vi.mock('./sprintPlanPatchApply', async (importOriginal) => ({
  ...(await importOriginal<typeof ApplyModule>()),
  applySprintPlanPatchOps: vi.fn(),
  runPlanPatchTrackerSyncs: vi.fn(() => Promise.resolve()),
}));

const transaction = vi.mocked(runBeerTrackerTransaction);
const claim = vi.mocked(claimPlanPatchApplyToken);
const confirmNotes = vi.mocked(confirmProposedCreateNotes);
const applyOps = vi.mocked(applySprintPlanPatchOps);
const trackerSyncs = vi.mocked(runPlanPatchTrackerSyncs);

const ops: SprintPlanPatchOp[] = [
  { assigneeId: 'dev-1', duration: 2, op: 'upsertPosition', startDay: 0, startPart: 0, taskId: 'BT-1' },
];
const tx = vi.fn();

function apply(onError: 'continue' | 'stop' = 'stop') {
  return applySprintPlanPatch({
    actorUserId: 'user-1',
    applyToken: 'pp1.token.sig',
    confirm: true,
    onError,
    ops,
    organizationId: 'org-1',
    sprintId: 7,
  });
}

describe('applySprintPlanPatch transaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation((fn) => fn(tx));
    claim.mockResolvedValue(true);
    confirmNotes.mockResolvedValue(1);
  });

  it('claims the token and confirms draft notes inside the same transaction', async () => {
    applyOps.mockResolvedValue({ applied: [{ index: 0, ok: true, op: 'upsertPosition' }], trackerSyncs: [] });
    const result = await apply();
    expect(result.ok).toBe(true);
    expect(claim.mock.calls[0]?.[1]).toBe(tx);
    expect(confirmNotes).toHaveBeenCalledWith({ commentIds: ['note-1'], sprintId: 7 }, tx);
  });

  it('rejects a token that was already applied', async () => {
    claim.mockResolvedValue(false);
    const result = await apply();
    expect(result).toMatchObject({ ok: false });
    expect(result.error).toMatch(/^already_applied/);
    expect(applyOps).not.toHaveBeenCalled();
  });

  it('rolls the whole patch back on a stop failure and skips tracker sync', async () => {
    applyOps.mockResolvedValue({
      applied: [{ error: 'goal x not found', index: 0, ok: false, op: 'deleteGoal' }],
      error: 'stopped at op[0] deleteGoal: goal x not found; nothing applied (rolled back)',
      trackerSyncs: [{ assigneeId: 'dev-1', index: 0, taskId: 'BT-1' }],
    });
    const result = await apply('stop');
    expect(result).toMatchObject({ ok: false, rolledBack: true });
    expect(trackerSyncs).not.toHaveBeenCalled();
  });

  it('commits successful ops with continue and syncs the tracker after commit', async () => {
    const order: string[] = [];
    transaction.mockImplementation(async (fn) => {
      const value = await fn(tx);
      order.push('commit');
      return value;
    });
    trackerSyncs.mockImplementation(() => {
      order.push('sync');
      return Promise.resolve();
    });
    applyOps.mockResolvedValue({
      applied: [{ index: 0, ok: true, op: 'upsertPosition' }],
      error: 'continued with 1 failed op(s)',
      trackerSyncs: [{ assigneeId: 'dev-1', index: 0, taskId: 'BT-1' }],
    });
    const result = await apply('continue');
    expect(result.rolledBack).toBeUndefined();
    expect(order).toEqual(['commit', 'sync']);
  });
});
