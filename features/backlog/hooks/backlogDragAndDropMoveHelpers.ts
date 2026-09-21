import type { Developer, Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';
import type { DragEndEvent } from '@dnd-kit/core';
import type { QueryClient } from '@tanstack/react-query';

import toast from 'react-hot-toast';

import { sprintTasksQueryKey } from '@/features/task/hooks/useTasks';
import { addIssueToSprint, removeIssueFromSprint } from '@/lib/beerTrackerApi';

import { findTaskInSprints, getSprintTasksData, type SprintTasksBundle } from './backlogDragAndDropHelpers';
import {
  restoreBacklogTaskOnRollback,
  revertBacklogMoveOnError,
  rollbackSourceSprintCache,
  rollbackTargetSprintCache,
} from './backlogDragAndDropRollbackHelpers';

type TranslateFn = (key: string, params?: Record<string, number | string>) => string;

export interface BacklogDragMoveContext {
  sourceSprintId: number | null;
  targetId: string;
  taskId: string;
  taskToMove: Task;
  wasInBacklog: boolean;
}

export async function moveTaskToBacklog(opts: {
  addTask: (task: Task) => void;
  boardId: number | null;
  forDemoPlanner: boolean;
  queryClient: QueryClient;
  removeTask: (taskId: string) => void;
  sourceSprintId: number;
  t: TranslateFn;
  taskId: string;
  taskToMove: Task;
}): Promise<void> {
  const { queryClient, boardId, taskId, sourceSprintId, taskToMove, addTask, removeTask, forDemoPlanner, t } =
    opts;

  const oldSourceSprintData = getSprintTasksData(queryClient, sourceSprintId, boardId, forDemoPlanner);

  addTask(taskToMove);
  queryClient.setQueryData<SprintTasksBundle>(sprintTasksQueryKey(sourceSprintId, boardId, forDemoPlanner), (old) => {
    if (!old) return old;
    return {
      ...old,
      tasks: old.tasks.filter((task) => task.id !== taskId),
    };
  });

  try {
    await removeIssueFromSprint(taskId, sourceSprintId);
    toast.success(t('backlog.dnd.movedToBacklog'));
  } catch (error) {
    revertBacklogMoveOnError({
      boardId,
      forDemoPlanner,
      oldSourceSprintData,
      queryClient,
      removeTask,
      sourceSprintId,
      taskId,
    });
    const errorMessage = error instanceof Error ? error.message : t('common.unknownError');
    toast.error(t('backlog.dnd.moveError', { message: errorMessage }));
    throw error;
  }
}

function applyMoveToSprintOptimisticUpdates(input: {
  backlogDevelopers: Developer[];
  boardId: number | null;
  forDemoPlanner: boolean;
  queryClient: QueryClient;
  removeTask: (taskId: string) => void;
  sourceSprintId: number | null;
  targetSprintId: number;
  taskId: string;
  taskToMove: Task;
  wasInBacklog: boolean;
}): { oldSourceSprintData: SprintTasksBundle | undefined; oldTargetSprintData: SprintTasksBundle | undefined } {
  const {
    queryClient,
    boardId,
    taskId,
    sourceSprintId,
    targetSprintId,
    taskToMove,
    wasInBacklog,
    backlogDevelopers,
    removeTask,
    forDemoPlanner,
  } = input;

  let oldSourceSprintData: SprintTasksBundle | undefined;
  if (sourceSprintId !== null) {
    oldSourceSprintData = getSprintTasksData(queryClient, sourceSprintId, boardId, forDemoPlanner);
  }
  const oldTargetSprintData = getSprintTasksData(queryClient, targetSprintId, boardId, forDemoPlanner);

  if (wasInBacklog) {
    removeTask(taskId);
  }

  if (sourceSprintId !== null && sourceSprintId !== targetSprintId) {
    queryClient.setQueryData<SprintTasksBundle>(sprintTasksQueryKey(sourceSprintId, boardId, forDemoPlanner), (old) => {
      if (!old) return old;
      return {
        ...old,
        tasks: old.tasks.filter((task) => task.id !== taskId),
      };
    });
  }

  queryClient.setQueryData<SprintTasksBundle>(sprintTasksQueryKey(targetSprintId, boardId, forDemoPlanner), (old) => {
    if (!old) {
      return {
        developers: backlogDevelopers,
        sprintInfo: null,
        tasks: [taskToMove],
      };
    }
    if (old.tasks.some((task) => task.id === taskId)) {
      return old;
    }
    return {
      ...old,
      tasks: [...old.tasks, taskToMove],
    };
  });

  return { oldSourceSprintData, oldTargetSprintData };
}

function rollbackMoveToSprintOptimisticUpdates(input: {
  addTask: (task: Task) => void;
  boardId: number | null;
  forDemoPlanner: boolean;
  oldSourceSprintData: SprintTasksBundle | undefined;
  oldTargetSprintData: SprintTasksBundle | undefined;
  queryClient: QueryClient;
  sourceSprintId: number | null;
  targetSprintId: number;
  taskToMove: Task;
  wasInBacklog: boolean;
}): void {
  const {
    wasInBacklog,
    addTask,
    taskToMove,
    oldSourceSprintData,
    sourceSprintId,
    queryClient,
    boardId,
    forDemoPlanner,
    oldTargetSprintData,
    targetSprintId,
  } = input;

  restoreBacklogTaskOnRollback({ wasInBacklog, addTask, taskToMove });
  rollbackSourceSprintCache({
    boardId,
    forDemoPlanner,
    oldSourceSprintData,
    queryClient,
    sourceSprintId,
  });
  rollbackTargetSprintCache({
    boardId,
    forDemoPlanner,
    oldTargetSprintData,
    queryClient,
    targetSprintId,
  });
}

export async function moveTaskToSprint(opts: {
  addTask: (task: Task) => void;
  backlogDevelopers: Developer[];
  boardId: number | null;
  forDemoPlanner: boolean;
  queryClient: QueryClient;
  removeTask: (taskId: string) => void;
  sourceSprintId: number | null;
  t: TranslateFn;
  targetSprintId: number;
  taskId: string;
  taskToMove: Task;
  wasInBacklog: boolean;
}): Promise<void> {
  const { oldSourceSprintData, oldTargetSprintData } = applyMoveToSprintOptimisticUpdates(opts);

  try {
    if (opts.sourceSprintId !== null && opts.sourceSprintId !== opts.targetSprintId) {
      await removeIssueFromSprint(opts.taskId, opts.sourceSprintId);
    }
    await addIssueToSprint(opts.taskId, opts.targetSprintId);
    toast.success(opts.t('backlog.dnd.movedToSprint'));
  } catch (error) {
    rollbackMoveToSprintOptimisticUpdates({
      ...opts,
      oldSourceSprintData,
      oldTargetSprintData,
    });
    const errorMessage = error instanceof Error ? error.message : opts.t('common.unknownError');
    toast.error(opts.t('backlog.dnd.moveError', { message: errorMessage }));
    throw error;
  }
}

export function resolveBacklogDragMoveContext(input: {
  activeSprints: SprintListItem[];
  backlogTasks: Task[];
  boardId: number | null;
  event: DragEndEvent;
  forDemoPlanner: boolean;
  queryClient: QueryClient;
  t: TranslateFn;
}): BacklogDragMoveContext | null {
  const { active, over } = input.event;
  if (!over) {
    return null;
  }

  const taskId = active.id as string;
  const targetId = over.id as string;
  const fromSprint = findTaskInSprints(
    input.queryClient,
    taskId,
    input.activeSprints,
    input.boardId,
    input.forDemoPlanner
  );

  let taskToMove: Task | undefined = fromSprint?.task;
  const sourceSprintId: number | null = fromSprint ? fromSprint.sourceSprintId : null;

  if (!taskToMove) {
    taskToMove = input.backlogTasks.find((task) => task.id === taskId);
  }

  if (!taskToMove) {
    toast.error(input.t('backlog.dnd.taskNotFound'));
    return null;
  }

  const wasInBacklog = !sourceSprintId && input.backlogTasks.some((task) => task.id === taskId);
  return { taskId, targetId, taskToMove, sourceSprintId, wasInBacklog };
}

export function parseBacklogSprintColumnTargetId(
  targetId: string,
  t: TranslateFn
): number | null {
  if (!targetId.startsWith('sprint-column-')) {
    return null;
  }
  const targetSprintId = parseInt(targetId.replace('sprint-column-', ''), 10);
  if (Number.isNaN(targetSprintId)) {
    toast.error(t('backlog.dnd.invalidSprintId'));
    return null;
  }
  return targetSprintId;
}
