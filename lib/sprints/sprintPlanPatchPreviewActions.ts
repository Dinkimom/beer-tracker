import type { PlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';

import {
  deleteTaskPosition,
  replaceTaskPositionSegments,
  upsertTaskPositionRecord,
} from '@/lib/sprints/taskPositionsRepository';

import {
  deletePlanPatchPositionPreviews,
  listPlanPatchPositionPreviews,
} from './sprintPlanPatchPositionPreviewRepository';

async function writePreview(input: {
  organizationId: string;
  preview: PlanPatchPositionPreview;
  sprintId: number;
}): Promise<void> {
  const { organizationId, preview, sprintId } = input;
  if (preview.remove) {
    await deleteTaskPosition({ organizationId, sprintId, taskId: preview.taskId });
    return;
  }
  await upsertTaskPositionRecord({
    assigneeId: preview.assigneeId,
    duration: preview.duration,
    isQa: undefined,
    organizationId,
    plannedDuration: null,
    plannedStartDay: null,
    plannedStartPart: null,
    sprintId,
    startDay: preview.startDay,
    startPart: preview.startPart,
    taskId: preview.taskId,
  });
  if (preview.segments !== undefined) {
    await replaceTaskPositionSegments({
      organizationId,
      segments: preview.segments,
      sprintId,
      taskId: preview.taskId,
    });
  }
}

export async function approvePlanPatchPositionPreviews(input: {
  organizationId: string;
  sprintId: number;
  taskId?: string;
}): Promise<number> {
  const previews = await listPlanPatchPositionPreviews(input);
  const selected = input.taskId
    ? previews.filter((preview) => preview.taskId === input.taskId)
    : previews;
  for (const preview of selected) {
    await writePreview({ organizationId: input.organizationId, preview, sprintId: input.sprintId });
    await deletePlanPatchPositionPreviews({
      organizationId: input.organizationId,
      sprintId: input.sprintId,
      taskId: preview.taskId,
    });
  }
  return selected.length;
}

export function rejectPlanPatchPositionPreviews(input: {
  organizationId: string;
  sprintId: number;
  taskId?: string;
}): Promise<number> {
  return deletePlanPatchPositionPreviews(input);
}
