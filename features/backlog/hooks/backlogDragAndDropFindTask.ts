import type { SprintTasksBundle } from './backlogDragAndDropHelpers';
import type { Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';
import type { QueryClient } from '@tanstack/react-query';

import { sprintTasksQueryKey } from '@/features/task/hooks/useTasks';

function findTaskInSprintBundle(
  tasksData: SprintTasksBundle | undefined,
  taskId: string,
  sourceSprintId: number
): { sourceSprintId: number; task: Task } | null {
  if (!tasksData?.tasks) return null;
  const task = tasksData.tasks.find((t) => t.id === taskId);
  return task ? { sourceSprintId, task } : null;
}

export function findTaskInSprints(
  queryClient: QueryClient,
  taskId: string,
  activeSprints: SprintListItem[],
  boardId: number | null,
  forDemoPlanner = false
): { sourceSprintId: number; task: Task } | null {
  for (const sprint of activeSprints) {
    const tasksData = queryClient.getQueryData<SprintTasksBundle>(
      sprintTasksQueryKey(sprint.id, boardId, forDemoPlanner)
    );
    const found = findTaskInSprintBundle(tasksData, taskId, sprint.id);
    if (found) return found;
  }
  return null;
}
