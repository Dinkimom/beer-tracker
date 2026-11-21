'use client';

import type { SprintGoalsResponse } from '@/lib/api/sprintGoals';
import type { ChecklistItem } from '@/types/tracker';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

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

interface SprintGoalsSummary {
  checklistDone: number;
  checklistTotal: number;
  deliveryChecklistItems: ChecklistItem[];
  deliveryGoalsLoading: boolean;
  discoveryChecklistItems: ChecklistItem[];
  discoveryGoalsLoading: boolean;
  goalsLoading: boolean;
  /** Перечитать цели после правки (все виды и спринты). */
  refresh: () => void;
}

const NO_CHECKLIST_ITEMS: ChecklistItem[] = [];

/**
 * Цели спринта целиком (Delivery + Discovery) — один хук для сайдбара и страниц.
 * Запросы те же, что у `useSprintGoals`, поэтому повторный вызов берёт данные из кэша.
 */
export function useSprintGoalsSummary(sprintId: number | null): SprintGoalsSummary {
  const delivery = useSprintGoals(sprintId, 'delivery');
  const discovery = useSprintGoals(sprintId, 'discovery');
  const queryClient = useQueryClient();
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['sprintGoals'] });
  }, [queryClient]);

  return useMemo(
    () => ({
      checklistDone: (delivery.data?.checklistDone ?? 0) + (discovery.data?.checklistDone ?? 0),
      checklistTotal: (delivery.data?.checklistTotal ?? 0) + (discovery.data?.checklistTotal ?? 0),
      deliveryChecklistItems: delivery.data?.checklistItems ?? NO_CHECKLIST_ITEMS,
      deliveryGoalsLoading: delivery.isLoading,
      discoveryChecklistItems: discovery.data?.checklistItems ?? NO_CHECKLIST_ITEMS,
      discoveryGoalsLoading: discovery.isLoading,
      goalsLoading: delivery.isLoading || discovery.isLoading,
      refresh,
    }),
    [delivery.data, delivery.isLoading, discovery.data, discovery.isLoading, refresh]
  );
}
