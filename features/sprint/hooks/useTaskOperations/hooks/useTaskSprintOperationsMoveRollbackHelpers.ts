import type { Task, TaskLink, TaskPosition } from '@/types';

import {
  rollbackOptimisticTaskRemoval,
  type SprintOperationSnapshot,
} from './useTaskSprintOperationsHelpers';

type StateUpdater<T> = (updater: (prev: T) => T) => void;

export function rollbackMoveToSprintOnError(input: {
  error: unknown;
  setTaskLinks: StateUpdater<TaskLink[]>;
  setTaskPositions: StateUpdater<Map<string, TaskPosition>>;
  setTasks: StateUpdater<Task[]>;
  shouldRemoveFromCurrent: boolean;
  snapshot: SprintOperationSnapshot;
  updateXarrow?: () => void;
}): never {
  if (input.shouldRemoveFromCurrent && input.snapshot.taskToMove) {
    rollbackOptimisticTaskRemoval({
      linksToDelete: input.snapshot.linksToDelete,
      setTaskLinks: input.setTaskLinks,
      setTaskPositions: input.setTaskPositions,
      setTasks: input.setTasks,
      snapshot: input.snapshot,
      updateXarrow: input.updateXarrow,
    });
  }
  throw input.error;
}
