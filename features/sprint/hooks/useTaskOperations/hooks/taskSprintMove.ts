/**
 * Уход задачи из спринта (перенос в другой спринт или в бэклог): что запомнить до запроса,
 * как убрать карточку с доски и вернуть её при ошибке. Карточку и стрелки в исходном спринте на
 * сервере убирает сам сервер (`lib/sprints/issueBoardCards.ts`) — для всех путей переноса.
 */

import type { Task, TaskLink, TaskPosition } from '@/types';

type StateUpdater<T> = (updater: (prev: T) => T) => void;

interface SprintOperationSnapshot {
  actualTaskId: string;
  linksToDelete: TaskLink[];
  positionToRemove?: TaskPosition;
  taskToMove?: Task;
}

interface BoardSetters {
  setTaskLinks: StateUpdater<TaskLink[]>;
  setTaskPositions: StateUpdater<Map<string, TaskPosition>>;
  setTasks: StateUpdater<Task[]>;
  updateXarrow?: () => void;
}

export function collectSprintOperationSnapshot(params: {
  actualTaskId: string;
  taskLinks: TaskLink[];
  taskPositions: Map<string, TaskPosition>;
  taskToMove?: Task;
}): SprintOperationSnapshot {
  const { actualTaskId } = params;
  return {
    actualTaskId,
    linksToDelete: params.taskLinks.filter(
      (link) => link.fromTaskId === actualTaskId || link.toTaskId === actualTaskId
    ),
    positionToRemove: params.taskPositions.get(actualTaskId),
    taskToMove: params.taskToMove,
  };
}

export function applyOptimisticTaskRemoval(
  board: BoardSetters,
  taskId: string,
  actualTaskId: string
): void {
  board.setTasks((prev) =>
    prev.filter((task) => task.id !== actualTaskId && task.originalTaskId !== taskId)
  );
  board.setTaskPositions((prev) => {
    const next = new Map(prev);
    next.delete(actualTaskId);
    return next;
  });
  board.setTaskLinks((prev) =>
    prev.filter((link) => link.fromTaskId !== actualTaskId && link.toTaskId !== actualTaskId)
  );
  board.updateXarrow?.();
}

export function rollbackOptimisticTaskRemoval(
  board: BoardSetters,
  snapshot: SprintOperationSnapshot
): void {
  const { actualTaskId, linksToDelete, positionToRemove, taskToMove } = snapshot;
  if (taskToMove) {
    board.setTasks((prev) => [...prev, taskToMove]);
  }
  if (positionToRemove) {
    board.setTaskPositions((prev) => new Map(prev).set(actualTaskId, positionToRemove));
  }
  if (linksToDelete.length > 0) {
    board.setTaskLinks((prev) => [...prev, ...linksToDelete]);
  }
  board.updateXarrow?.();
}

/**
 * Задача приходит в целевой спринт без плана (K4): старая позиция там, если была, удаляется.
 * Карточку и стрелки в исходном спринте убирает сервер, когда трекер снял задачу со спринта.
 */
export async function resetTargetSprintPlan(targetSprintId: number, actualTaskId: string): Promise<void> {
  const { deleteTaskPosition } = await import('@/lib/beerTrackerApi');
  await deleteTaskPosition(targetSprintId, actualTaskId).catch((error) => {
    console.error('Error deleting position in target sprint:', error);
  });
}
