import type { PlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';
import type { TaskPosition } from '@/types';

interface PreviewMap {
  delete(taskId: string): void;
  set(taskId: string, preview: PlanPatchPositionPreview): void;
}

interface PositionMap {
  delete(taskId: string): void;
  get(taskId: string): TaskPosition | undefined;
  set(taskId: string, position: TaskPosition): void;
}

interface PlanPatchPreviewSnapshot {
  positions: Map<string, TaskPosition | undefined>;
  previews: PlanPatchPositionPreview[];
}

function positionFromPreview(
  current: TaskPosition | undefined,
  preview: PlanPatchPositionPreview
): TaskPosition {
  return {
    ...current,
    assignee: preview.assigneeId,
    duration: preview.duration,
    startDay: preview.startDay,
    startPart: preview.startPart,
    taskId: preview.taskId,
  };
}

export function acceptPlanPatchPreviewsLocally(
  positions: PositionMap,
  previews: PreviewMap,
  accepted: readonly PlanPatchPositionPreview[]
): PlanPatchPreviewSnapshot {
  const snapshot: PlanPatchPreviewSnapshot = {
    positions: new Map(accepted.map((preview) => [preview.taskId, positions.get(preview.taskId)])),
    previews: [...accepted],
  };
  for (const preview of accepted) {
    previews.delete(preview.taskId);
    if (preview.remove) {
      positions.delete(preview.taskId);
    } else {
      positions.set(preview.taskId, positionFromPreview(positions.get(preview.taskId), preview));
    }
  }
  return snapshot;
}

export function restorePlanPatchPreviewsLocally(
  positions: PositionMap,
  previews: PreviewMap,
  snapshot: PlanPatchPreviewSnapshot
): void {
  for (const preview of snapshot.previews) {
    previews.set(preview.taskId, preview);
    const previous = snapshot.positions.get(preview.taskId);
    if (previous) {
      positions.set(preview.taskId, previous);
    } else {
      positions.delete(preview.taskId);
    }
  }
}
