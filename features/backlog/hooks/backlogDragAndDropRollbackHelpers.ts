import type { SprintTasksBundle } from './backlogDragAndDropHelpers';
import type { Task } from '@/types';
import type { QueryClient } from '@tanstack/react-query';

import { sprintTasksQueryKey } from '@/features/task/hooks/useTasks';

export function revertBacklogMoveOnError(opts: {
  boardId: number | null;
  forDemoPlanner: boolean;
  oldSourceSprintData: SprintTasksBundle | undefined;
  queryClient: QueryClient;
  removeTask: (taskId: string) => void;
  sourceSprintId: number;
  taskId: string;
}): void {
  opts.removeTask(opts.taskId);
  if (opts.oldSourceSprintData) {
    opts.queryClient.setQueryData(
      sprintTasksQueryKey(opts.sourceSprintId, opts.boardId, opts.forDemoPlanner),
      opts.oldSourceSprintData,
    );
  } else {
    opts.queryClient.invalidateQueries({
      queryKey: sprintTasksQueryKey(opts.sourceSprintId, opts.boardId, opts.forDemoPlanner),
    });
  }
}

export function rollbackSourceSprintCache(opts: {
  boardId: number | null;
  forDemoPlanner: boolean;
  oldSourceSprintData: SprintTasksBundle | undefined;
  queryClient: QueryClient;
  sourceSprintId: number | null;
}): void {
  if (opts.oldSourceSprintData && opts.sourceSprintId !== null) {
    opts.queryClient.setQueryData(
      sprintTasksQueryKey(opts.sourceSprintId, opts.boardId, opts.forDemoPlanner),
      opts.oldSourceSprintData,
    );
    return;
  }
  if (opts.sourceSprintId !== null) {
    opts.queryClient.invalidateQueries({
      queryKey: sprintTasksQueryKey(opts.sourceSprintId, opts.boardId, opts.forDemoPlanner),
    });
  }
}

export function rollbackTargetSprintCache(opts: {
  boardId: number | null;
  forDemoPlanner: boolean;
  oldTargetSprintData: SprintTasksBundle | undefined;
  queryClient: QueryClient;
  targetSprintId: number;
}): void {
  if (opts.oldTargetSprintData) {
    opts.queryClient.setQueryData(
      sprintTasksQueryKey(opts.targetSprintId, opts.boardId, opts.forDemoPlanner),
      opts.oldTargetSprintData,
    );
    return;
  }
  opts.queryClient.invalidateQueries({
    queryKey: sprintTasksQueryKey(opts.targetSprintId, opts.boardId, opts.forDemoPlanner),
  });
}

export function restoreBacklogTaskOnRollback(opts: {
  addTask: (task: Task) => void;
  taskToMove: Task;
  wasInBacklog: boolean;
}): void {
  if (opts.wasInBacklog) {
    opts.addTask(opts.taskToMove);
  }
}
