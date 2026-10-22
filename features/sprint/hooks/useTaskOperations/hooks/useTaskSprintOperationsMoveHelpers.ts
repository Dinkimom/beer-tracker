import type { Task, TaskLink, TaskPosition } from '@/types';

import { playTaskBoardExit } from '@/features/task/utils/taskBoardExit';

import {
  applyOptimisticTaskRemoval,
  type SprintOperationSnapshot,
} from './useTaskSprintOperationsHelpers';
import { rollbackMoveToSprintOnError } from './useTaskSprintOperationsMoveRollbackHelpers';
import { submitMoveToSprint } from './useTaskSprintOperationsMoveSuccessHelpers';

type StateUpdater<T> = (updater: (prev: T) => T) => void;

export async function executeMoveToSprint(input: {
  deleteLink: (linkId: string) => Promise<void>;
  deletePosition: (taskId: string) => Promise<void>;
  notify?: boolean;
  onTasksReload?: () => Promise<void> | void;
  selectedSprintId: number | null;
  setTaskLinks: StateUpdater<TaskLink[]>;
  setTaskPositions: StateUpdater<Map<string, TaskPosition>>;
  setTasks: StateUpdater<Task[]>;
  snapshot: SprintOperationSnapshot;
  sprintId: number;
  successMessage: string;
  taskId: string;
  updateXarrow?: () => void;
}): Promise<void> {
  const shouldRemoveFromCurrent =
    input.selectedSprintId != null && input.selectedSprintId !== input.sprintId;

  // Карточка уезжает параллельно с запросом и пропадает из списка после анимации.
  const removedFromBoard = shouldRemoveFromCurrent
    ? playTaskBoardExit([input.taskId, input.snapshot.actualTaskId], 'sprint', () => {
        applyOptimisticTaskRemoval({
          actualTaskId: input.snapshot.actualTaskId,
          setTaskLinks: input.setTaskLinks,
          setTaskPositions: input.setTaskPositions,
          setTasks: input.setTasks,
          taskId: input.taskId,
          updateXarrow: input.updateXarrow,
        });
      })
    : Promise.resolve();

  try {
    await submitMoveToSprint({
      deleteLink: input.deleteLink,
      deletePosition: input.deletePosition,
      notify: input.notify,
      onTasksReload: input.onTasksReload,
      selectedSprintId: input.selectedSprintId,
      setTaskLinks: input.setTaskLinks,
      setTaskPositions: input.setTaskPositions,
      setTasks: input.setTasks,
      shouldRemoveFromCurrent,
      snapshot: input.snapshot,
      sprintId: input.sprintId,
      successMessage: input.successMessage,
      taskId: input.taskId,
    });
  } catch (error) {
    // Откат только после удаления — иначе отложенное удаление снова скроет карточку.
    await removedFromBoard;
    rollbackMoveToSprintOnError({
      error,
      setTaskLinks: input.setTaskLinks,
      setTaskPositions: input.setTaskPositions,
      setTasks: input.setTasks,
      shouldRemoveFromCurrent,
      snapshot: input.snapshot,
      updateXarrow: input.updateXarrow,
    });
  }
}
