import type { QueryClient } from '@tanstack/react-query';

import { occupancyTasksQueryKeyPrefix, sprintTasksQueryKey } from '@/features/task/hooks/useTasks';

function sprintsCacheQueryKey(forDemoPlanner: boolean, boardId: number) {
  return forDemoPlanner ? (['sprints', 'demo', boardId] as const) : (['sprints', boardId] as const);
}

export function applyReloadTasksSuccess(
  queryClient: QueryClient,
  params: {
    boardId: number | null;
    forDemoPlanner: boolean;
    sprintId: number | null;
    sprintsData: unknown;
    tasksData: unknown;
  }
): void {
  const { boardId, forDemoPlanner, sprintId, sprintsData, tasksData } = params;
  queryClient.setQueryData(sprintTasksQueryKey(sprintId, boardId, forDemoPlanner), tasksData);
  queryClient.invalidateQueries({
    queryKey: occupancyTasksQueryKeyPrefix(sprintId, boardId, forDemoPlanner),
  });
  if (sprintsData && boardId) {
    queryClient.setQueryData(sprintsCacheQueryKey(forDemoPlanner, boardId), sprintsData);
  }
}
