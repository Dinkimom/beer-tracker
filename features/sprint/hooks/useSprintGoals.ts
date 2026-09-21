'use client';

import type { ChecklistItem } from '@/types/tracker';

import { useQuery } from '@tanstack/react-query';

import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { fetchSprintGoals } from '@/lib/api/sprintGoals';

interface SprintGoalsData {
  checklistDone: number;
  checklistItems: ChecklistItem[];
  checklistTotal: number;
}

/**
 * Хук для загрузки целей спринта из таблицы sprint_goals (Delivery или Discovery)
 */
export function useSprintGoals(
  sprintId: number | null,
  goalType: 'delivery' | 'discovery'
) {
  const forDemoPlanner = useDemoPlannerBoardsQueryScope();
  return useQuery({
    queryKey: forDemoPlanner
      ? (['sprintGoals', 'demo', sprintId, goalType] as const)
      : (['sprintGoals', sprintId, goalType] as const),
    queryFn: async (): Promise<SprintGoalsData | null> => {
      if (sprintId == null) return null;
      return await fetchSprintGoals(sprintId, goalType);
    },
    enabled: sprintId != null,
    staleTime: 1000 * 60 * 2, // 2 минуты
  });
}
