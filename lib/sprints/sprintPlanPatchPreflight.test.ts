import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/sprintGoals', () => ({
  sprintGoalExists: vi.fn(),
}));

vi.mock('@/lib/sprints/sprintCommentsRepository', () => ({
  sprintCommentExists: vi.fn(),
}));

vi.mock('@/lib/sprintGoals/sprintGoalRouteHelpers', () => ({
  resolveSprintGoalPlanRow: vi.fn(),
}));

import { sprintGoalExists } from '@/lib/sprintGoals';
import { resolveSprintGoalPlanRow } from '@/lib/sprintGoals/sprintGoalRouteHelpers';
import { sprintCommentExists } from '@/lib/sprints/sprintCommentsRepository';

import { assertPlanPatchTargetsExist } from './sprintPlanPatchPreflight';

describe('assertPlanPatchTargetsExist', () => {
  beforeEach(() => {
    vi.mocked(sprintCommentExists).mockReset();
    vi.mocked(sprintGoalExists).mockReset();
  });

  it('passes when note and goal targets exist', async () => {
    vi.mocked(sprintCommentExists).mockResolvedValue(true);
    vi.mocked(sprintGoalExists).mockResolvedValue(true);
    await expect(
      assertPlanPatchTargetsExist({
        ops: [
          { commentId: '11111111-1111-4111-8111-111111111111', op: 'deleteNote' },
          { id: '22222222-2222-4222-8222-222222222222', op: 'deleteGoal' },
        ],
        organizationId: 'org-1',
        sprintId: 1,
      })
    ).resolves.toBeUndefined();
  });

  it('fails with preflight_failed when note is missing', async () => {
    vi.mocked(sprintCommentExists).mockResolvedValue(false);
    await expect(
      assertPlanPatchTargetsExist({
        ops: [{ commentId: '11111111-1111-4111-8111-111111111111', op: 'updateNote', text: 'x' }],
        organizationId: 'org-1',
        sprintId: 1,
      })
    ).rejects.toThrow(/preflight_failed.*note/);
  });

  it('fails when moveToSprintId points at the patched sprint', async () => {
    await expect(
      assertPlanPatchTargetsExist({
        ops: [{ moveToSprintId: 1, op: 'deletePosition', taskId: 'RND-1' }],
        organizationId: 'org-1',
        sprintId: 1,
      })
    ).rejects.toThrow(/preflight_failed.*moveToSprintId 1 is this sprint/);
  });

  it('fails when a goal is linked to a row that is not in the quarterly plan (QG5)', async () => {
    const planRow = { quarter: 4 as const, rowId: 'gone', year: 2026 };
    vi.mocked(resolveSprintGoalPlanRow).mockResolvedValue({ error: 'planRow: no epic or direction gone in the plan of 2026 Q4' });
    await expect(
      assertPlanPatchTargetsExist({
        ops: [{ goalType: 'delivery', op: 'createGoal', planRow, text: 'Ship it' }],
        organizationId: 'org-1',
        sprintId: 1,
      })
    ).rejects.toThrow('ops[0] createGoal: planRow: no epic or direction gone');
    expect(resolveSprintGoalPlanRow).toHaveBeenCalledWith('org-1', planRow);
  });

  it('does not look up the plan for goals without planRow', async () => {
    vi.mocked(resolveSprintGoalPlanRow).mockReset();
    await expect(
      assertPlanPatchTargetsExist({
        ops: [{ goalType: 'discovery', op: 'createGoal', text: 'Research' }],
        organizationId: 'org-1',
        sprintId: 1,
      })
    ).resolves.toBeUndefined();
    expect(resolveSprintGoalPlanRow).not.toHaveBeenCalled();
  });
});
