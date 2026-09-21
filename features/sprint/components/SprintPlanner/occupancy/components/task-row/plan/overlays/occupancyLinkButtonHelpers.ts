import type { Task, TaskPosition } from '@/types';

export function resolveOccupancyLinkStartPhaseId(
  position: TaskPosition | undefined,
  qaPosition: TaskPosition | undefined,
  task: Task,
  qaTask: Task | undefined
): string | null {
  if (position) {
    return task.id;
  }
  if (qaPosition && qaTask) {
    return qaTask.id;
  }
  return null;
}

export function resolveOccupancyAddPhaseTargetTask(
  task: Task,
  position: TaskPosition | undefined,
  qaTask: Task | undefined,
  qaPosition: TaskPosition | undefined,
  startCell: number,
  devPhaseEndCell: number
): Task | null {
  if (!position) {
    return task;
  }
  if (qaTask && !qaPosition && startCell >= devPhaseEndCell) {
    return qaTask;
  }
  return null;
}
