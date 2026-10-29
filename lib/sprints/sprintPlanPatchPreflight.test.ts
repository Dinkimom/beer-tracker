import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/sprintGoals', () => ({
  sprintGoalExists: vi.fn(),
}));

vi.mock('@/lib/sprints/sprintCommentsRepository', () => ({
  sprintCommentExists: vi.fn(),
}));

import { sprintGoalExists } from '@/lib/sprintGoals';
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
        sprintId: 1,
      })
    ).resolves.toBeUndefined();
  });

  it('fails with preflight_failed when note is missing', async () => {
    vi.mocked(sprintCommentExists).mockResolvedValue(false);
    await expect(
      assertPlanPatchTargetsExist({
        ops: [{ commentId: '11111111-1111-4111-8111-111111111111', op: 'updateNote', text: 'x' }],
        sprintId: 1,
      })
    ).rejects.toThrow(/preflight_failed.*note/);
  });

  it('fails when moveToSprintId points at the patched sprint', async () => {
    await expect(
      assertPlanPatchTargetsExist({
        ops: [{ moveToSprintId: 1, op: 'deletePosition', taskId: 'RND-1' }],
        sprintId: 1,
      })
    ).rejects.toThrow(/preflight_failed.*moveToSprintId 1 is this sprint/);
  });
});
