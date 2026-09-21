import type { Task, TaskPosition } from '@/types';

import { getTaskPoints, storyPointsToTimeslots } from '@/lib/pointsUtils';
import { parseSwimlaneTaskDraggableId } from '@/lib/swimlane/swimlaneDragIds';
import { getOrderedPlanSegments } from '@/lib/swimlane/swimlanePlanSegments';

function getPositionEffectiveDuration(position: TaskPosition): number {
  if (position.segments && position.segments.length > 0) {
    return position.segments.reduce((sum, s) => sum + s.duration, 0);
  }
  return position.duration;
}

function resolveSegmentDragDuration(
  activeTaskId: string,
  activeDraggableId: string,
  taskPositions: Map<string, TaskPosition>
): number | null {
  const { taskId, segmentIndex } = parseSwimlaneTaskDraggableId(activeDraggableId);
  if (taskId !== activeTaskId || segmentIndex == null) {
    return null;
  }
  const pos = taskPositions.get(activeTaskId);
  if (!pos) {
    return null;
  }
  const seg = getOrderedPlanSegments(pos)[segmentIndex];
  return seg ? seg.duration : null;
}

/**
 * Длительность задачи в частях дня для DnD (позиция или story points).
 */
export function getTaskDuration(
  taskId: string,
  taskPositions: Map<string, TaskPosition>,
  tasks: Task[]
): number {
  const existingPosition = taskPositions.get(taskId);
  if (existingPosition) {
    return getPositionEffectiveDuration(existingPosition);
  }

  const task = tasks.find((t) => t.id === taskId);
  return task ? Math.max(1, storyPointsToTimeslots(getTaskPoints(task))) : 1;
}

/**
 * Длительность активного drag-превью: отрезок при `taskId::segmentIndex`, иначе эффективная длина позиции.
 */
export function resolveActiveDragDurationParts(
  activeTaskId: string | null,
  activeDraggableId: string | null,
  taskPositions: Map<string, TaskPosition>,
  tasks: Task[]
): number | null {
  if (!activeTaskId) return null;

  if (activeDraggableId) {
    const fromSegment = resolveSegmentDragDuration(activeTaskId, activeDraggableId, taskPositions);
    if (fromSegment != null) {
      return fromSegment;
    }
  }

  return getTaskDuration(activeTaskId, taskPositions, tasks);
}
