import type { SprintPlanAnchor } from '@/lib/api/sprints';
import type { PlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';
import type { TaskPosition } from '@/types';

import {
  fetchPlanPatchPositionPreviews,
  fetchSprintPlanAnchors,
  fetchSprintPositions,
} from '@/lib/beerTrackerApi';

/** Parallel positions + plan-anchors fetch used by {@link TaskPositionsStore.loadSprint}. */
export async function fetchSprintPositionsBundle(sprintId: number): Promise<{
  anchors: SprintPlanAnchor[];
  positions: TaskPosition[];
  previews: PlanPatchPositionPreview[];
}> {
  const [data, anchors, previews] = await Promise.all([
    fetchSprintPositions(sprintId),
    fetchSprintPlanAnchors(sprintId).catch(() => [] as SprintPlanAnchor[]),
    fetchPlanPatchPositionPreviews(sprintId).catch(() => [] as PlanPatchPositionPreview[]),
  ]);
  return {
    anchors,
    positions: Array.isArray(data) ? data : [],
    previews,
  };
}

export function replacePlanPatchPreviews(
  target: Map<string, PlanPatchPositionPreview>,
  previews: readonly PlanPatchPositionPreview[]
): void {
  target.clear();
  for (const preview of previews) {
    target.set(preview.taskId, preview);
  }
}
