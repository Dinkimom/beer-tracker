import type { Task, TaskPosition } from '@/types';

import { isTaskDone } from '@/features/sprint/utils/sprintMetrics';
import { collectTimelineHoverLinkedTaskIds } from '@/features/swimlane/utils/task-arrows/collectTimelinePredecessorTaskIds';
import { getTaskTestPoints } from '@/lib/pointsUtils';

function occupancyCompletedTestPointsForSharedQa(task: Task, qaTask: Task): number {
  const devTp = getTaskTestPoints(task);
  const qaTp = getTaskTestPoints(qaTask);
  const scope = Math.max(devTp, qaTp);
  return scope > 0 && (isTaskDone(task) || isTaskDone(qaTask)) ? scope : 0;
}

function occupancyCompletedTestPointsForSeparateQa(task: Task, qaTask: Task): number {
  let completed = 0;
  const devTp = getTaskTestPoints(task);
  const qaTp = getTaskTestPoints(qaTask);
  if (devTp > 0 && isTaskDone(task)) completed += devTp;
  if (qaTp > 0 && isTaskDone(qaTask)) completed += qaTp;
  return completed;
}

export function occupancyCompletedTestPoints(task: Task, qaTask: Task | undefined): number {
  const devTp = getTaskTestPoints(task);
  if (qaTask == null) {
    return devTp > 0 && isTaskDone(task) ? devTp : 0;
  }
  if (qaTask.originalTaskId === task.id) {
    return occupancyCompletedTestPointsForSharedQa(task, qaTask);
  }
  return occupancyCompletedTestPointsForSeparateQa(task, qaTask);
}

export function collectHoverConnectedTaskIds(
  hoveredPhaseTaskId: string,
  taskLinks: Array<{ fromTaskId: string; toTaskId: string; id: string }>,
  taskPositions?: Map<string, TaskPosition>
): Set<string> {
  return collectTimelineHoverLinkedTaskIds(hoveredPhaseTaskId, taskLinks, taskPositions);
}
