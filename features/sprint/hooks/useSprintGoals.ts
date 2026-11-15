'use client';

import type { SprintGoalsResponse } from '@/lib/api/sprintGoals';

import { useQuery } from '@tanstack/react-query';

import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { fetchSprintGoals } from '@/lib/api/sprintGoals';

import { sprintGoalsQueryKey } from './sprintGoalManagementHelpers';

/**
 * Хук для загрузки целей спринта из таблицы sprint_goals (Delivery или Discovery)
 */
export function useSprintGoals(
  sprintId: number | null,
  goalType: 'delivery' | 'discovery'
) {
  const forDemoPlanner = useDemoPlannerBoardsQueryScope();
  return useQuery({
    queryKey: sprintGoalsQueryKey(forDemoPlanner, sprintId, goalType),
    queryFn: async (): Promise<SprintGoalsResponse | null> => {
      if (sprintId == null) return null;
      return await fetchSprintGoals(sprintId, goalType);
    },
    enabled: sprintId != null,
    staleTime: 1000 * 60 * 2, // 2 минуты
  });
}
