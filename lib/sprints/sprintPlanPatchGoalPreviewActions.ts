import type { PlanPatchGoalPreview } from '@/lib/sprints/sprintPlanPatchGoalPreview';

import { runAsBoardActor } from '@/lib/boardHistory/boardEventActor';
import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import {
  deleteSprintGoal,
  insertSprintGoal,
  syncSprintGoalsToTracker,
  updateSprintGoal,
} from '@/lib/sprintGoals';

import {
  deletePlanPatchGoalPreviews,
  listPlanPatchGoalPreviews,
} from './sprintPlanPatchGoalPreviewRepository';

/** Цель от агента, принятая человеком: в журнале доски — его правка через агента. */
async function writeGoalPreview(input: {
  organizationId: string;
  ownerId: string;
  preview: PlanPatchGoalPreview;
  sprintId: number;
}): Promise<void> {
  const { organizationId, preview, sprintId } = input;
  const actor = { actorId: input.ownerId, channel: 'agent' as const, clientBrand: preview.clientBrand };
  await runAsBoardActor(actor, async (tx) => {
    if (preview.action === 'delete') {
      await deleteSprintGoal({ goalId: preview.goalId, organizationId }, tx);
      return;
    }
    if (preview.action === 'create') {
      await insertSprintGoal(
        { goalId: preview.goalId, goalType: preview.goalType, organizationId, sprintId, text: preview.text },
        tx
      );
      return;
    }
    await updateSprintGoal(
      { goalId: preview.goalId, organizationId, patch: { done: preview.done, text: preview.text } },
      tx
    );
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
      ownerId: input.ownerId,
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
  if (selected.length > 0) {
    await syncSprintGoalsToTracker({
      getIssueTracker: () => getIssueTrackerProviderClientForOrganization(input.organizationId),
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
