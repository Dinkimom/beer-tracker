'use client';

import type { Developer, Task } from '@/types';

import { useQueries } from '@tanstack/react-query';

import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { sprintTasksQueryKey } from '@/features/task/hooks/useTasks';
import { fetchSprintTasks } from '@/lib/beerTrackerApi';

import { collectBacklogFilterPeople, type BacklogFilterPerson } from '../utils/backlogFilterPeople';

export function useBacklogFilterPeople(input: {
  backlogDevelopers: Developer[];
  backlogTasks: Task[];
  boardId: number | null;
  sprintIds: number[];
}): BacklogFilterPerson[] {
  const forDemoPlanner = useDemoPlannerBoardsQueryScope();
  const { backlogDevelopers, backlogTasks, boardId, sprintIds } = input;
  const results = useQueries({
    queries: sprintIds.map((sprintId) => ({
      enabled: sprintId > 0,
      queryFn: () => fetchSprintTasks(sprintId, boardId ?? undefined),
      queryKey: sprintTasksQueryKey(sprintId, boardId, forDemoPlanner),
      staleTime: 1000 * 60 * 2,
    })),
  });

  return collectBacklogFilterPeople({
    backlogDevelopers,
    backlogTasks,
    sprintBundles: results.map((result) => result.data),
  });
}
