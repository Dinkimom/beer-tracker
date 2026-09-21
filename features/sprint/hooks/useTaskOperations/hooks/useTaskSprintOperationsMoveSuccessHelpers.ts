import type { Task, TaskLink, TaskPosition } from '@/types';

import toast from 'react-hot-toast';

import { addIssueToSprint } from '@/lib/beerTrackerApi';

import {
  deletePositionAndLinksAfterMove,
  type SprintOperationSnapshot,
} from './useTaskSprintOperationsHelpers';

type StateUpdater<T> = (updater: (prev: T) => T) => void;

async function finalizeMoveToSprintSuccess(input: {
  deleteLink: (linkId: string) => Promise<void>;
  deletePosition: (taskId: string) => Promise<void>;
  notify?: boolean;
  onTasksReload?: () => Promise<void> | void;
  selectedSprintId: number | null;
  shouldRemoveFromCurrent: boolean;
  snapshot: SprintOperationSnapshot;
  sprintId: number;
  sprintName: string;
}): Promise<void> {
  if (input.notify !== false) {
    toast.success(`Задача перенесена в спринт ${input.sprintName}`);
  }

  if (input.selectedSprintId === input.sprintId && input.onTasksReload) {
    await input.onTasksReload();
  }

  if (input.shouldRemoveFromCurrent) {
    await deletePositionAndLinksAfterMove({
      actualTaskId: input.snapshot.actualTaskId,
      deleteLink: input.deleteLink,
      deletePosition: input.deletePosition,
      linksToDelete: input.snapshot.linksToDelete,
      positionToRemove: input.snapshot.positionToRemove,
      targetSprintId: input.sprintId,
    });
  }
}

export async function submitMoveToSprint(input: {
  deleteLink: (linkId: string) => Promise<void>;
  deletePosition: (taskId: string) => Promise<void>;
  notify?: boolean;
  onTasksReload?: () => Promise<void> | void;
  selectedSprintId: number | null;
  setTaskLinks: StateUpdater<TaskLink[]>;
  setTaskPositions: StateUpdater<Map<string, TaskPosition>>;
  setTasks: StateUpdater<Task[]>;
  shouldRemoveFromCurrent: boolean;
  snapshot: SprintOperationSnapshot;
  sprintId: number;
  sprintName: string;
  taskId: string;
}): Promise<void> {
  const success = await addIssueToSprint(input.taskId, input.sprintId);
  if (!success) throw new Error('Failed to move task to sprint');
  await finalizeMoveToSprintSuccess(input);
}
