import type { Developer, Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';
import type { QueryClient } from '@tanstack/react-query';

import { sprintTasksQueryKey } from '@/features/task/hooks/useTasks';

interface SprintTasksCache {
  developers: Developer[];
  sprintInfo: unknown;
  tasks: Task[];
}

export function findActiveTaskInSprints(
  activeTaskId: string,
  activeSprints: SprintListItem[],
  boardId: number | null,
  forDemoPlanner: boolean,
  queryClient: QueryClient
): { activeTask: Task; activeTaskDevelopers: Developer[] } | null {
  for (const sprint of activeSprints) {
    const tasksData = queryClient.getQueryData<SprintTasksCache>(
      sprintTasksQueryKey(sprint.id, boardId, forDemoPlanner)
    );

    if (!tasksData?.tasks) {
      continue;
    }

    const foundTask = tasksData.tasks.find((task) => task.id === activeTaskId);
    if (foundTask) {
      return {
        activeTask: foundTask,
        activeTaskDevelopers: tasksData.developers || [],
      };
    }
  }

  return null;
}
