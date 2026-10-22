import type { PlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

export async function approvePlanPatchPositionPreview(
  sprintId: number,
  taskId?: string
): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().post(
      `/sprints/${sprintId}/plan-patch-previews`,
      taskId ? { taskId } : {}
    );
    return true;
  } catch (error) {
    console.error(`Failed to approve plan patch preview in sprint ${sprintId}:`, error);
    return false;
  }
}

export async function rejectPlanPatchPositionPreview(
  sprintId: number,
  taskId?: string
): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().delete(`/sprints/${sprintId}/plan-patch-previews`, {
      params: taskId ? { taskId } : {},
    });
    return true;
  } catch (error) {
    console.error(`Failed to reject plan patch preview in sprint ${sprintId}:`, error);
    return false;
  }
}

export async function movePlanPatchPositionPreview(
  sprintId: number,
  preview: PlanPatchPositionPreview
): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().patch(`/sprints/${sprintId}/plan-patch-previews`, {
      assigneeId: preview.assigneeId,
      changes: preview.changes,
      duration: preview.duration,
      ...(preview.segments !== undefined ? { segments: preview.segments } : {}),
      startDay: preview.startDay,
      startPart: preview.startPart,
      taskId: preview.taskId,
    });
    return true;
  } catch (error) {
    console.error(`Failed to move plan patch preview in sprint ${sprintId}:`, error);
    return false;
  }
}
