import type { PlanPatchGoalPreview } from './sprintPlanPatchGoalPreview';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteSprintGoal, insertSprintGoal, updateSprintGoal } from '@/lib/sprintGoals';

import {
  approvePlanPatchGoalPreviews,
  rejectPlanPatchGoalPreviews,
} from './sprintPlanPatchGoalPreviewActions';
import {
  deletePlanPatchGoalPreviews,
  listPlanPatchGoalPreviews,
} from './sprintPlanPatchGoalPreviewRepository';

vi.mock('@/lib/sprintGoals', () => ({
  deleteSprintGoal: vi.fn(),
  insertSprintGoal: vi.fn(),
  updateSprintGoal: vi.fn(),
}));

vi.mock('./sprintPlanPatchGoalPreviewRepository', () => ({
  deletePlanPatchGoalPreviews: vi.fn(),
  listPlanPatchGoalPreviews: vi.fn(),
}));

const list = vi.mocked(listPlanPatchGoalPreviews);
const remove = vi.mocked(deletePlanPatchGoalPreviews);
const insert = vi.mocked(insertSprintGoal);
const update = vi.mocked(updateSprintGoal);
const drop = vi.mocked(deleteSprintGoal);

const created: PlanPatchGoalPreview = {
  action: 'create',
  done: false,
  goalId: '11111111-1111-4111-8111-111111111111',
  goalType: 'delivery',
  text: 'Review',
};

describe('plan patch goal preview actions', () => {
  beforeEach(() => {
    list.mockReset();
    remove.mockReset();
    insert.mockReset();
    update.mockReset();
    drop.mockReset();
    remove.mockResolvedValue(1);
    list.mockResolvedValue([created]);
  });

  it('inserts a created goal with the preview id and drops that preview', async () => {
    await expect(
      approvePlanPatchGoalPreviews({ organizationId: 'org', sprintId: 7, goalId: created.goalId })
    ).resolves.toBe(1);
    expect(insert).toHaveBeenCalledWith({
      goalId: created.goalId,
      goalType: 'delivery',
      organizationId: 'org',
      sprintId: 7,
      text: 'Review',
    });
    expect(remove).toHaveBeenCalledWith({
      goalId: created.goalId,
      organizationId: 'org',
      sprintId: 7,
    });
  });

  it('updates text and done, and deletes a goal marked for removal', async () => {
    const updated: PlanPatchGoalPreview = { ...created, action: 'update', text: 'Next' };
    const removed: PlanPatchGoalPreview = { ...created, action: 'delete', goalId: '22222222-2222-4222-8222-222222222222' };
    list.mockResolvedValue([updated, removed]);
    await approvePlanPatchGoalPreviews({ organizationId: 'org', sprintId: 7 });
    expect(update).toHaveBeenCalledWith({
      goalId: updated.goalId,
      organizationId: 'org',
      updateFields: ['text = $1', 'done = $2'],
      updateValues: ['Next', false],
    });
    expect(drop).toHaveBeenCalledWith({ goalId: removed.goalId, organizationId: 'org' });
  });

  it('rejects by deleting the preview without writing the goal', async () => {
    await rejectPlanPatchGoalPreviews({ organizationId: 'org', sprintId: 7, goalId: created.goalId });
    expect(remove).toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(drop).not.toHaveBeenCalled();
  });
});
