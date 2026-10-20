import type { PlanPatchGoalPreview } from '@/lib/sprints/sprintPlanPatchGoalPreview';

import { deleteSprintGoal, insertSprintGoal, updateSprintGoal } from '@/lib/sprintGoals';

import {
  deletePlanPatchGoalPreviews,
  listPlanPatchGoalPreviews,
} from './sprintPlanPatchGoalPreviewRepository';

async function writeGoalPreview(input: {
  organizationId: string;
  preview: PlanPatchGoalPreview;
  sprintId: number;
}): Promise<void> {
  const { organizationId, preview, sprintId } = input;
  if (preview.action === 'delete') {
    await deleteSprintGoal({ goalId: preview.goalId, organizationId });
    return;
  }
  if (preview.action === 'create') {
    await insertSprintGoal({
      goalId: preview.goalId,
      goalType: preview.goalType,
      organizationId,
      sprintId,
      text: preview.text,
    });
    return;
  }
  await updateSprintGoal({
    goalId: preview.goalId,
    organizationId,
    updateFields: ['text = $1', 'done = $2'],
    updateValues: [preview.text, preview.done],
  });
}

export async function approvePlanPatchGoalPreviews(input: {
  goalId?: string;
  organizationId: string;
  ownerId: string;
  sprintId: number;
}): Promise<number> {
  const previews = await listPlanPatchGoalPreviews(input);
  const selected = input.goalId
    ? previews.filter((preview) => preview.goalId === input.goalId)
    : previews;
  for (const preview of selected) {
    await writeGoalPreview({
      organizationId: input.organizationId,
      preview,
      sprintId: input.sprintId,
    });
    await deletePlanPatchGoalPreviews({
      goalId: preview.goalId,
      organizationId: input.organizationId,
      ownerId: input.ownerId,
      sprintId: input.sprintId,
    });
  }
  return selected.length;
}

export function rejectPlanPatchGoalPreviews(input: {
  goalId?: string;
  organizationId: string;
  ownerId: string;
  sprintId: number;
}): Promise<number> {
  return deletePlanPatchGoalPreviews(input);
}
