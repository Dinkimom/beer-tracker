'use client';

import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { fetchQuarterlyPlan } from '@/lib/api/quarterlyPlans';
import { quartersOfWindow } from '@/lib/quarterlyPlans/quarterWeeks';
import { buildGoalPlanRowOptions, type SprintGoalPlanRow } from '@/lib/sprintGoals/sprintGoalPlanRow';

import { sprintGoalsQueryKey } from './sprintGoalManagementHelpers';
import { runEditGoalUpdate } from './useSprintGoalManagementHelpers';

/** Кэш строк плана для привязки целей; доска квартала сбрасывает его, когда сохраняет план. */
export const SPRINT_GOAL_PLAN_ROWS_QUERY_KEY = ['sprintGoalPlanRows'] as const;

/**
 * Привязка целей спринта к строкам квартального плана (QG5): строки планов кварталов, которые задевает
 * спринт, и запись привязки. Планы перечитываются при открытии целей и после правки на доске квартала.
 */
export function useSprintGoalPlanRows(input: {
  boardId: number | null;
  sprintId: number | null;
  sprintWindow: { endDate?: string; startDate?: string } | null;
}) {
  const { boardId, sprintId } = input;
  const startDate = input.sprintWindow?.startDate;
  const endDate = input.sprintWindow?.endDate;
  const queryClient = useQueryClient();
  const forDemoPlanner = useDemoPlannerBoardsQueryScope();
  const refs = useMemo(() => (startDate && endDate ? quartersOfWindow({ endDate, startDate }) : []), [endDate, startDate]);

  const plans = useQueries({
    combine: (results) => ({
      plans: results.flatMap((result) => (result.data ? [result.data] : [])),
      ready: results.every((result) => !result.isPending),
    }),
    queries: refs.map((ref) => ({
      queryFn: async () => (await fetchQuarterlyPlan(ref)).plan,
      queryKey: [...SPRINT_GOAL_PLAN_ROWS_QUERY_KEY, forDemoPlanner ? 'demo' : 'live', ref.year, ref.quarter] as const,
      // По умолчанию запросы при монтировании не перечитываются, а строки плана меняют на доске квартала.
      refetchOnMount: 'always' as const,
    })),
  });

  const options = useMemo(() => buildGoalPlanRowOptions(plans.plans, boardId), [boardId, plans.plans]);

  const setPlanRow = useCallback(
    (goalType: 'delivery' | 'discovery', itemId: string, planRow: SprintGoalPlanRow | null) => {
      runEditGoalUpdate({
        itemId,
        queryClient,
        queryKey: sprintGoalsQueryKey(forDemoPlanner, sprintId, goalType),
        updates: { planRow },
      }).catch(() => undefined);
    },
    [forDemoPlanner, queryClient, sprintId]
  );

  return { options, ready: plans.ready, setPlanRow };
}
