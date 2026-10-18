import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

export async function approvePlanPatchGoalPreview(
  sprintId: number,
  goalId?: string
): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().post(
      `/sprints/${sprintId}/plan-patch-goal-previews`,
      goalId ? { goalId } : {}
    );
    return true;
  } catch (error) {
    console.error(`Failed to approve plan patch goal preview in sprint ${sprintId}:`, error);
    return false;
  }
}

export async function rejectPlanPatchGoalPreview(
  sprintId: number,
  goalId?: string
): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().delete(`/sprints/${sprintId}/plan-patch-goal-previews`, {
      params: goalId ? { goalId } : {},
    });
    return true;
  } catch (error) {
    console.error(`Failed to reject plan patch goal preview in sprint ${sprintId}:`, error);
    return false;
  }
}
