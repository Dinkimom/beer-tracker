import type { SprintPlanAnchor } from '@/lib/api/sprints';
import type { PlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';
import type { SwimlaneCardLayer } from '@/lib/swimlane/swimlaneCardLayers';
import type { TaskPosition } from '@/types';

import {
  fetchPlanPatchPositionPreviews,
  fetchSprintLaneLayers,
  fetchSprintPlanAnchors,
  fetchSprintPositions,
} from '@/lib/beerTrackerApi';
import { stripPositionSource } from '@/lib/layers/data/mappers/taskPositionToApi';

/** Parallel positions + plan-anchors fetch used by {@link TaskPositionsStore.loadSprint}. */
export async function fetchSprintPositionsBundle(sprintId: number): Promise<{
  anchors: SprintPlanAnchor[];
  laneLayers: SwimlaneCardLayer[];
  positions: TaskPosition[];
  previews: PlanPatchPositionPreview[];
}> {
  const [data, anchors, previews, laneLayers] = await Promise.all([
    fetchSprintPositions(sprintId),
    fetchSprintPlanAnchors(sprintId).catch(() => [] as SprintPlanAnchor[]),
    fetchPlanPatchPositionPreviews(sprintId).catch(() => [] as PlanPatchPositionPreview[]),
    fetchSprintLaneLayers(sprintId).catch(() => [] as SwimlaneCardLayer[]),
  ]);
  return {
    anchors,
    laneLayers,
    positions: Array.isArray(data) ? data : [],
    previews,
  };
}

export function replacePlanAnchors(
  target: Map<string, SprintPlanAnchor>,
  anchors: readonly SprintPlanAnchor[]
): void {
  target.clear();
  for (const anchor of anchors) {
    target.set(anchor.taskId, anchor);
  }
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

/** Ответ сервера + неотправленные локальные правки + черновик плана (черновик поверх всего). */
export function mergeRemotePositions(
  remote: readonly TaskPosition[],
  pending: ReadonlyMap<string, { position: TaskPosition }>,
  draftKeep: ReadonlyMap<string, TaskPosition>
): Map<string, TaskPosition> {
  const next = new Map<string, TaskPosition>();
  for (const position of remote) {
    if (!pending.has(position.taskId)) next.set(position.taskId, position);
  }
  for (const [taskId, update] of pending) {
    next.set(taskId, stripPositionSource(update.position));
  }
  draftKeep.forEach((position, taskId) => {
    next.set(taskId, position);
  });
  return next;
}
