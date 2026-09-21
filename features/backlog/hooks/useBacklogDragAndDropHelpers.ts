import type { Developer, Task } from '@/types';
import type { QueryClient } from '@tanstack/react-query';

import {
  moveTaskToBacklog,
  moveTaskToSprint,
  parseBacklogSprintColumnTargetId,
  type BacklogDragMoveContext,
} from './backlogDragAndDropMoveHelpers';

type TranslateFn = (key: string, params?: Record<string, number | string>) => string;

export async function executeBacklogDragMove(
  moveContext: BacklogDragMoveContext,
  opts: {
    addTask: (task: Task) => void;
    backlogDevelopers: Developer[];
    boardId: number | null;
    forDemoPlanner: boolean;
    queryClient: QueryClient;
    removeTask: (taskId: string) => void;
    t: TranslateFn;
  }
): Promise<void> {
  const { taskId, targetId, taskToMove, sourceSprintId, wasInBacklog } = moveContext;
  const { addTask, backlogDevelopers, boardId, forDemoPlanner, queryClient, removeTask, t } = opts;

  if (targetId === 'backlog-column') {
    if (!sourceSprintId) {
      return;
    }
    await moveTaskToBacklog({
      addTask,
      boardId,
      forDemoPlanner,
      queryClient,
      removeTask,
      sourceSprintId,
      t,
      taskId,
      taskToMove,
    });
    return;
  }

  const targetSprintId = parseBacklogSprintColumnTargetId(targetId, t);
  if (targetSprintId == null || sourceSprintId === targetSprintId) {
    return;
  }

  await moveTaskToSprint({
    addTask,
    backlogDevelopers,
    boardId,
    forDemoPlanner,
    queryClient,
    removeTask,
    sourceSprintId,
    t,
    targetSprintId,
    taskId,
    taskToMove,
    wasInBacklog,
  });
}
