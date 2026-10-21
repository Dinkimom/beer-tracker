/**
 * Хук для операций переноса и удаления задач из спринта
 */

import type { Task, TaskLink, TaskPosition } from '@/types';

import { useCallback } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { removeIssueFromSprint } from '@/lib/beerTrackerApi';

import { findTaskById, getActualTaskId } from '../utils/taskUtils';

import {
  applyOptimisticTaskRemoval,
  collectSprintOperationSnapshot,
  deletePositionAndLinksAfterMove,
} from './useTaskSprintOperationsHelpers';
import { executeMoveToSprint } from './useTaskSprintOperationsMoveHelpers';

interface UseTaskSprintOperationsProps {
  selectedSprintId: number | null;
  sprints: Array<{ id: number; name: string }>;
  taskLinks: TaskLink[];
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  deleteLink: (linkId: string) => Promise<void>;
  deletePosition: (taskId: string) => Promise<void>;
  onTasksReload?: () => Promise<void> | void;
  setTaskLinks: (updater: (prev: TaskLink[]) => TaskLink[]) => void;
  setTaskPositions: (updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
  updateXarrow?: () => void;
}

export function useTaskSprintOperations({
  tasks,
  taskPositions,
  taskLinks,
  selectedSprintId,
  sprints,
  setTasks,
  setTaskPositions,
  setTaskLinks,
  deletePosition,
  deleteLink,
  onTasksReload,
  updateXarrow,
}: UseTaskSprintOperationsProps) {
  const { t } = useI18n();
  const moveToSprint = useCallback(
    async (taskId: string, sprintId: number, options?: { notify?: boolean }): Promise<void> => {
      const snapshot = collectSprintOperationSnapshot({
        taskId,
        taskLinks,
        taskPositions,
        tasks,
        findTaskById,
        getActualTaskId,
      });
      const targetSprint = sprints.find((s) => s.id === sprintId);
      const sprintName = targetSprint?.name || t('sprint.fallbackName', { id: sprintId });

      await executeMoveToSprint({
        deleteLink,
        deletePosition,
        notify: options?.notify,
        onTasksReload,
        selectedSprintId,
        setTaskLinks,
        setTaskPositions,
        setTasks,
        snapshot,
        sprintId,
        successMessage: t('sprint.taskToast.movedToSprint', { sprintName }),
        taskId,
        updateXarrow,
      });
    },
    [
      tasks,
      taskPositions,
      taskLinks,
      selectedSprintId,
      sprints,
      setTasks,
      setTaskPositions,
      setTaskLinks,
      deletePosition,
      deleteLink,
      onTasksReload,
      updateXarrow,
      t,
    ]
  );

  const removeFromSprint = useCallback(
    async (taskId: string, options?: { notify?: boolean }): Promise<void> => {
      if (!selectedSprintId) {
        console.error('No selected sprint ID');
        return;
      }

      const sprintId = selectedSprintId;
      const snapshot = collectSprintOperationSnapshot({
        taskId,
        taskLinks,
        taskPositions,
        tasks,
        findTaskById,
        getActualTaskId,
      });

      try {
        const success = await removeIssueFromSprint(taskId, sprintId);

        if (!success) {
          throw new Error('Failed to remove task from sprint');
        }

        await deletePositionAndLinksAfterMove({
          actualTaskId: snapshot.actualTaskId,
          deleteLink,
          deletePosition,
          linksToDelete: snapshot.linksToDelete,
          positionToRemove: snapshot.positionToRemove,
        });

        // UI обновляем в конце — иначе задача пропадает со свимлейна
        // ещё при открытом диалоге подтверждения с лоадером.
        applyOptimisticTaskRemoval({
          actualTaskId: snapshot.actualTaskId,
          setTaskLinks,
          setTaskPositions,
          setTasks,
          taskId,
          updateXarrow,
        });

        if (options?.notify !== false) {
          toast.success(t('sprint.taskToast.removedToBacklog'));
        }
      } catch (error) {
        console.error('Error removing task from sprint:', error);
        toast.error(t('sprint.taskToast.removeFromSprintFailed'));
        throw error;
      }
    },
    [
      tasks,
      taskPositions,
      taskLinks,
      selectedSprintId,
      setTasks,
      setTaskPositions,
      setTaskLinks,
      deletePosition,
      deleteLink,
      updateXarrow,
      t,
    ]
  );

  return {
    moveToSprint,
    removeFromSprint,
  };
}
