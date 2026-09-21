import type { PositionPreview } from '../components/task-row/plan/OccupancyPhaseBar';
import type { TaskPosition } from '@/types';

function previewMatchesSavedPosition(
  preview: PositionPreview,
  saved: TaskPosition
): boolean {
  return (
    saved.startDay === preview.startDay &&
    saved.startPart === preview.startPart &&
    saved.duration === preview.duration
  );
}

function removeMatchingPreviewEntry(
  next: Map<string, PositionPreview>,
  taskId: string,
  preview: PositionPreview,
  taskPositions: Map<string, TaskPosition>
): boolean {
  const saved = taskPositions.get(taskId);
  if (saved && previewMatchesSavedPosition(preview, saved)) {
    next.delete(taskId);
    return true;
  }
  return false;
}

export function pruneStalePositionPreviews(
  prev: Map<string, PositionPreview>,
  taskPositions: Map<string, TaskPosition>
): Map<string, PositionPreview> {
  if (prev.size === 0) return prev;
  let changed = false;
  const next = new Map(prev);
  for (const [taskId, preview] of next) {
    if (removeMatchingPreviewEntry(next, taskId, preview, taskPositions)) {
      changed = true;
    }
  }
  return changed ? next : prev;
}
