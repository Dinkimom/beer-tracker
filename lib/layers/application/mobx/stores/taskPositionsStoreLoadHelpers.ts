import type { SprintPlanAnchor } from '@/lib/api/sprints';
import type { TaskPosition } from '@/types';

import { fetchSprintPlanAnchors, fetchSprintPositions } from '@/lib/beerTrackerApi';

/** Parallel positions + plan-anchors fetch used by {@link TaskPositionsStore.loadSprint}. */
export async function fetchSprintPositionsBundle(sprintId: number): Promise<{
  anchors: SprintPlanAnchor[];
  positions: TaskPosition[];
}> {
  const [data, anchors] = await Promise.all([
    fetchSprintPositions(sprintId),
    fetchSprintPlanAnchors(sprintId).catch(() => [] as SprintPlanAnchor[]),
  ]);
  return {
    anchors,
    positions: Array.isArray(data) ? data : [],
  };
}
