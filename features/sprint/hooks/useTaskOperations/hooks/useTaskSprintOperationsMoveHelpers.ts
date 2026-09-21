import type { Task, TaskLink, TaskPosition } from '@/types';

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
  sprintName: string;
  taskId: string;
  updateXarrow?: () => void;
}): Promise<void> {
  const shouldRemoveFromCurrent =
    input.selectedSprintId != null && input.selectedSprintId !== input.sprintId;

  if (shouldRemoveFromCurrent) {
    applyOptimisticTaskRemoval({
      actualTaskId: input.snapshot.actualTaskId,
      setTaskLinks: input.setTaskLinks,
      setTaskPositions: input.setTaskPositions,
      setTasks: input.setTasks,
      taskId: input.taskId,
      updateXarrow: input.updateXarrow,
    });
  }

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
      sprintName: input.sprintName,
      taskId: input.taskId,
    });
  } catch (error) {
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
