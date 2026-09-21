import type { Task, TaskLink, TaskPosition } from '@/types';

import {
  deleteLinksAfterMove,
  deleteStoredPositionAfterMove,
  deleteTargetSprintPosition,
} from './useTaskSprintOperationsDeleteHelpers';

type StateUpdater<T> = (updater: (prev: T) => T) => void;

export interface SprintOperationSnapshot {
  actualTaskId: string;
  linksToDelete: TaskLink[];
  positionToRemove?: TaskPosition;
  taskToMove?: Task;
}

export function collectSprintOperationSnapshot(params: {
  taskId: string;
  taskLinks: TaskLink[];
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  findTaskById: (tasks: Task[], taskId: string) => Task | undefined;
  getActualTaskId: (tasks: Task[], taskId: string) => string;
}): SprintOperationSnapshot {
  const taskToMove = params.findTaskById(params.tasks, params.taskId);
  const actualTaskId = params.getActualTaskId(params.tasks, params.taskId);
  const positionToRemove = params.taskPositions.get(actualTaskId);
  const linksToDelete = params.taskLinks.filter(
    (link) => link.fromTaskId === actualTaskId || link.toTaskId === actualTaskId
  );
  return { actualTaskId, linksToDelete, positionToRemove, taskToMove };
}

export function applyOptimisticTaskRemoval(params: {
  actualTaskId: string;
  setTaskLinks: StateUpdater<TaskLink[]>;
  setTaskPositions: StateUpdater<Map<string, TaskPosition>>;
  setTasks: StateUpdater<Task[]>;
  taskId: string;
  updateXarrow?: () => void;
}): void {
  params.setTasks((prev) =>
    prev.filter((task) => task.id !== params.actualTaskId && task.originalTaskId !== params.taskId)
  );
  params.setTaskPositions((prev) => {
    const newPositions = new Map(prev);
    newPositions.delete(params.actualTaskId);
    return newPositions;
  });
  params.setTaskLinks((prev) =>
    prev.filter(
      (link) => link.fromTaskId !== params.actualTaskId && link.toTaskId !== params.actualTaskId
    )
  );
  params.updateXarrow?.();
}

export function rollbackOptimisticTaskRemoval(params: {
  linksToDelete: TaskLink[];
  setTaskLinks: StateUpdater<TaskLink[]>;
  setTaskPositions: StateUpdater<Map<string, TaskPosition>>;
  setTasks: StateUpdater<Task[]>;
  snapshot: SprintOperationSnapshot;
  updateXarrow?: () => void;
}): void {
  if (params.snapshot.taskToMove) {
    params.setTasks((prev) => [...prev, params.snapshot.taskToMove!]);
  }
  if (params.snapshot.positionToRemove) {
    params.setTaskPositions((prev) => {
      const newPositions = new Map(prev);
      newPositions.set(params.snapshot.actualTaskId, params.snapshot.positionToRemove!);
      return newPositions;
    });
  }
  if (params.linksToDelete.length > 0) {
    params.setTaskLinks((prev) => [...prev, ...params.linksToDelete]);
  }
  params.updateXarrow?.();
}

export async function deletePositionAndLinksAfterMove(params: {
  actualTaskId: string;
  deleteLink: (linkId: string) => Promise<void>;
  deletePosition: (taskId: string) => Promise<void>;
  linksToDelete: TaskLink[];
  positionToRemove?: TaskPosition;
  targetSprintId?: number;
}): Promise<void> {
  await deleteStoredPositionAfterMove(
    params.actualTaskId,
    params.deletePosition,
    params.positionToRemove
  );

  await deleteLinksAfterMove(params.linksToDelete, params.deleteLink);

  await deleteTargetSprintPosition(params.targetSprintId, params.actualTaskId);
}
