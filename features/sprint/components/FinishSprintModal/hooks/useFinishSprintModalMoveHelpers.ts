import type { MoveTasksTo, Task } from '@/types';

import { addIssueToSprint, removeIssueFromAllSprints } from '@/lib/beerTrackerApi';

import { getTasksToMoveOnSprintFinish } from './useFinishSprintModalHelpers';

async function moveTasksToBacklog(unfinishedTasks: Task[]): Promise<void> {
  const moveResults = await Promise.allSettled(
    unfinishedTasks.map((task) => removeIssueFromAllSprints(task.id))
  );
  const failedMoves = moveResults.filter(
    (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value)
  );
  if (failedMoves.length > 0) {
    console.error('Failed to move some tasks to backlog:', failedMoves);
  }
}

async function moveTasksToTargetSprint(
  unfinishedTasks: Task[],
  selectedSprintId: number
): Promise<void> {
  const moveResults = await Promise.allSettled(
    unfinishedTasks.map((task) => addIssueToSprint(task.id, selectedSprintId))
  );
  const failedMoves = moveResults.filter(
    (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value)
  );
  if (failedMoves.length > 0) {
    console.error('Failed to move some tasks to sprint:', failedMoves);
  }
}

export async function moveUnfinishedTasksOnFinish(params: {
  goalTasks: Array<{ id: string }>;
  moveTasksTo: MoveTasksTo;
  selectedSprintId: number | null;
  tasks: Task[];
}): Promise<void> {
  const goalIdSet = new Set(params.goalTasks.map((g) => g.id));
  const unfinishedTasks = getTasksToMoveOnSprintFinish(params.tasks, goalIdSet);
  if (unfinishedTasks.length === 0) return;

  if (params.moveTasksTo === 'backlog') {
    await moveTasksToBacklog(unfinishedTasks);
    return;
  }

  if (params.moveTasksTo === 'sprint' && params.selectedSprintId) {
    await moveTasksToTargetSprint(unfinishedTasks, params.selectedSprintId);
  }
}
