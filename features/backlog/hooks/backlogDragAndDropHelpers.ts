import type { Task } from '@/types';
import type { QueryClient } from '@tanstack/react-query';

import { sprintTasksQueryKey } from '@/features/task/hooks/useTasks';

export interface SprintTasksBundle {
  developers: unknown[];
  sprintInfo: unknown;
  tasks: Task[];
}

export { findTaskInSprints } from './backlogDragAndDropFindTask';

export function getSprintTasksData(
  queryClient: QueryClient,
  sprintId: number,
  boardId: number | null,
  forDemoPlanner = false
): SprintTasksBundle | undefined {
  return queryClient.getQueryData<SprintTasksBundle>(sprintTasksQueryKey(sprintId, boardId, forDemoPlanner));
}
