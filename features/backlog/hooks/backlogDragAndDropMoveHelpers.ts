import type { Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';
import type { DragEndEvent } from '@dnd-kit/core';
import type { QueryClient } from '@tanstack/react-query';

import toast from 'react-hot-toast';

import { findTaskInSprints } from './backlogDragAndDropFindTask';

type TranslateFn = (key: string, params?: Record<string, number | string>) => string;

interface BacklogDragMoveContext {
  sourceSprintId: number | null;
  targetId: string;
  taskId: string;
  taskToMove: Task;
  wasInBacklog: boolean;
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
