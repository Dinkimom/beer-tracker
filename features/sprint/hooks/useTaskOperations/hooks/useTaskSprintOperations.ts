/**
 * Перенос задачи в другой спринт и удаление из спринта: карточка уходит с доски анимацией,
 * при ошибке возвращается. Задачи, позиции и связи читаются из модели доски в момент действия.
 */

import type { SprintBoard } from '@/features/sprint/model/SprintBoard';
import type { Task, TaskPosition } from '@/types';

import { useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { playTaskBoardExit } from '@/features/task/utils/taskBoardExit';
import { addIssueToSprint, removeIssueFromSprint } from '@/lib/beerTrackerApi';

import { findTaskById, getActualTaskId } from '../utils/taskUtils';

import {
  applyOptimisticTaskRemoval,
  collectSprintOperationSnapshot,
  deletePositionAndLinksAfterMove,
  rollbackOptimisticTaskRemoval,
} from './taskSprintMove';

export interface UseTaskSprintOperationsProps {
  /** Задачи, позиции и связи — из модели доски. */
  board: SprintBoard;
  selectedSprintId: number | null;
  sprints: Array<{ id: number; name: string }>;
  deletePosition: (taskId: string) => Promise<void>;
  onTasksReload?: () => Promise<void> | void;
  setTaskPositions: (updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
  updateXarrow?: () => void;
}

export function useTaskSprintOperations({
  board,
  selectedSprintId,
  sprints,
  deletePosition,
  onTasksReload,
  setTaskPositions,
  setTasks,
  updateXarrow,
}: UseTaskSprintOperationsProps) {
  const { t } = useI18n();

  const takeSnapshot = useCallback(
    (taskId: string) => {
      const { tasks } = board;
      return collectSprintOperationSnapshot({
        actualTaskId: getActualTaskId(tasks, taskId),
        taskLinks: board.links.items,
        taskPositions: board.displayPositions,
        taskToMove: findTaskById(tasks, taskId),
      });
    },
    [board]
  );

  const setters = useMemo(
    () => ({ setTaskLinks: board.links.setWithSave, setTaskPositions, setTasks, updateXarrow }),
    [board, setTaskPositions, setTasks, updateXarrow]
  );

  const moveToSprint = useCallback(
    async (taskId: string, sprintId: number, options?: { notify?: boolean }): Promise<void> => {
      const snapshot = takeSnapshot(taskId);
      const shouldRemoveFromCurrent = selectedSprintId != null && selectedSprintId !== sprintId;
      // Карточка уезжает параллельно с запросом и пропадает из списка после анимации.
      const removedFromBoard = shouldRemoveFromCurrent
        ? playTaskBoardExit([taskId, snapshot.actualTaskId], 'sprint', () =>
            applyOptimisticTaskRemoval(setters, taskId, snapshot.actualTaskId)
          )
        : Promise.resolve();

      try {
        if (!(await addIssueToSprint(taskId, sprintId))) {
          throw new Error('Failed to move task to sprint');
        }
        if (options?.notify !== false) {
          const sprintName =
            sprints.find((s) => s.id === sprintId)?.name || t('sprint.fallbackName', { id: sprintId });
          toast.success(t('sprint.taskToast.movedToSprint', { sprintName }));
        }
        if (selectedSprintId === sprintId && onTasksReload) {
          await onTasksReload();
        }
        if (shouldRemoveFromCurrent) {
          await deletePositionAndLinksAfterMove({
            deleteLink: board.links.delete,
            deletePosition,
            snapshot,
            targetSprintId: sprintId,
          });
        }
      } catch (error) {
        // Откат только после удаления — иначе отложенное удаление снова скроет карточку.
        await removedFromBoard;
        if (shouldRemoveFromCurrent && snapshot.taskToMove) {
          rollbackOptimisticTaskRemoval(setters, snapshot);
        }
        throw error;
      }
    },
    [board, deletePosition, onTasksReload, selectedSprintId, setters, sprints, t, takeSnapshot]
  );

  const removeFromSprint = useCallback(
    async (taskId: string, options?: { notify?: boolean }): Promise<void> => {
      if (!selectedSprintId) {
        console.error('No selected sprint ID');
        return;
      }
      const snapshot = takeSnapshot(taskId);

      try {
        if (!(await removeIssueFromSprint(taskId, selectedSprintId))) {
          throw new Error('Failed to remove task from sprint');
        }
        await deletePositionAndLinksAfterMove({
          deleteLink: board.links.delete,
          deletePosition,
          snapshot,
        });

        // UI обновляем в конце — иначе задача пропадает со свимлейна
        // ещё при открытом диалоге подтверждения с лоадером. Анимацию не ждём:
        // диалог закрывается, и уход карточки в бэклог виден на доске.
        void playTaskBoardExit([taskId, snapshot.actualTaskId], 'backlog', () =>
          applyOptimisticTaskRemoval(setters, taskId, snapshot.actualTaskId)
        );

        if (options?.notify !== false) {
          toast.success(t('sprint.taskToast.removedToBacklog'));
        }
      } catch (error) {
        console.error('Error removing task from sprint:', error);
        toast.error(t('sprint.taskToast.removeFromSprintFailed'));
        throw error;
      }
    },
    [board, deletePosition, selectedSprintId, setters, t, takeSnapshot]
  );

  return {
    moveToSprint,
    removeFromSprint,
  };
}
