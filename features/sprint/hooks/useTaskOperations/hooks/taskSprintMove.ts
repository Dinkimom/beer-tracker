/**
 * Уход задачи из спринта (перенос в другой спринт или в бэклог): что запомнить до запроса,
 * как убрать карточку с доски и вернуть её при ошибке, что удалить на сервере после успеха.
 */

import type { Task, TaskLink, TaskPosition } from '@/types';

import { plannerLinkInvolvesComment } from '@/lib/planner/plannerLinkPersistence';

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
 * Удаляет только связи приложения (с участием заметки — они хранятся в `task_links`).
 * Связи задача↔задача приходят из трекера и при переносе в трекере не трогаются.
 */
export async function deleteLinksAfterMove(
  linksToDelete: TaskLink[],
  deleteLink: (linkId: string) => Promise<void>
): Promise<void> {
  const plannerLinks = linksToDelete.filter((link) =>
    plannerLinkInvolvesComment(link.fromTaskId, link.toTaskId)
  );
  await Promise.all(
    plannerLinks.map((link) =>
      deleteLink(link.id).catch((error) => {
        console.error('Error deleting link:', error);
      })
    )
  );
}

/** Следы задачи в исходном спринте (позиция, связи с заметками) и позиция в целевом. Ошибки не мешают переносу. */
export async function deletePositionAndLinksAfterMove(params: {
  deleteLink: (linkId: string) => Promise<void>;
  deletePosition: (taskId: string) => Promise<void>;
  snapshot: SprintOperationSnapshot;
  targetSprintId?: number;
}): Promise<void> {
  const { actualTaskId, linksToDelete, positionToRemove } = params.snapshot;
  if (positionToRemove) {
    await params.deletePosition(actualTaskId).catch((error) => {
      console.error('Error deleting position:', error);
    });
  }
  await deleteLinksAfterMove(linksToDelete, params.deleteLink);
  if (params.targetSprintId != null) {
    const { deleteTaskPosition } = await import('@/lib/beerTrackerApi');
    await deleteTaskPosition(params.targetSprintId, actualTaskId).catch((error) => {
      console.error('Error deleting position in target sprint:', error);
    });
  }
}
