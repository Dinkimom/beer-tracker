import type { PlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';
import type { TaskPosition } from '@/types';

import { positionToStartCell } from '@/lib/planner-timeline';

import { taskPositionsIntersectInTime } from './layerUtilsHelpers';

const MAX_PREVIEW_LAYER = 40;

export function planPatchPreviewLayerKey(taskId: string): string {
  return `plan-patch-preview-layer:${taskId}`;
}

interface PreviewLayerOccupant {
  layer: number;
  layerShiftUp?: number;
  position: TaskPosition;
  span?: number;
}

interface PreviewLayerCard {
  position: TaskPosition;
  taskId: string;
}

interface PlacedPreview extends PreviewLayerCard {
  layer: number;
}

function rangesOverlap(ghostLayer: number, occupant: PreviewLayerOccupant): boolean {
  const start = occupant.layer - Math.max(0, occupant.layerShiftUp ?? 0);
  const end = start + Math.max(1, occupant.span ?? 1);
  return ghostLayer < end && start < ghostLayer + 1;
}

function conflictsAtLayer(
  preview: TaskPosition,
  layer: number,
  occupants: readonly PreviewLayerOccupant[],
  placed: readonly PlacedPreview[]
): boolean {
  const hitsOccupant = occupants.some(
    (occupant) =>
      rangesOverlap(layer, occupant) && taskPositionsIntersectInTime(preview, occupant.position)
  );
  if (hitsOccupant) {
    return true;
  }
  return placed.some(
    (card) => card.layer === layer && taskPositionsIntersectInTime(preview, card.position)
  );
}

export function assignPlanPatchPreviewLayers(input: {
  occupants: readonly PreviewLayerOccupant[];
  previews: readonly PreviewLayerCard[];
}): Map<string, number> {
  const placed: PlacedPreview[] = [];
  const layers = new Map<string, number>();
  const ordered = [...input.previews].sort(
    (a, b) => positionToStartCell(a.position) - positionToStartCell(b.position)
  );
  for (const preview of ordered) {
    let layer = 0;
    while (
      layer < MAX_PREVIEW_LAYER &&
      conflictsAtLayer(preview.position, layer, input.occupants, placed)
    ) {
      layer += 1;
    }
    placed.push({ ...preview, layer });
    layers.set(preview.taskId, layer);
  }
  return layers;
}

export function mergePlanPatchPreviewLayers(input: {
  assigneeId: string;
  occupants: readonly PreviewLayerOccupant[];
  previews: Iterable<PlanPatchPositionPreview>;
  taskLayerMap: Map<string, number>;
}): void {
  const cards: PreviewLayerCard[] = [];
  for (const preview of input.previews) {
    if (preview.remove || preview.assigneeId !== input.assigneeId) {
      continue;
    }
    cards.push({
      position: {
        assignee: preview.assigneeId,
        duration: preview.duration,
        startDay: preview.startDay,
        startPart: preview.startPart,
        taskId: preview.taskId,
      },
      taskId: preview.taskId,
    });
  }
  const assigned = assignPlanPatchPreviewLayers({ occupants: input.occupants, previews: cards });
  for (const [taskId, layer] of assigned) {
    input.taskLayerMap.set(planPatchPreviewLayerKey(taskId), layer);
  }
}
