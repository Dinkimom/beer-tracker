'use client';

import type { QuarterGoalType, QuarterRowGoalFlag } from './quarterlyPlanBoardModel';
import type { SprintGoalsResponse } from '@/lib/api/sprintGoals';
import type { QuarterlyPlan } from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { QuarterWeek } from '@/lib/quarterlyPlans/quarterWeeks';

import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { sprintGoalsQueryKey } from '@/features/sprint/hooks/sprintGoalManagementHelpers';
import { fetchSprintGoals } from '@/lib/api/sprintGoals';

import { buildRowGoalFlags } from './quarterlyPlanBoardModel';

/** Как у `useSprintGoals`: те же ключи и срок, поэтому кнопка целей в строке команды и флажки делят кэш. */
const SPRINT_GOALS_STALE_MS = 1000 * 60 * 2;
const GOAL_TYPES: readonly QuarterGoalType[] = ['delivery', 'discovery'];

/**
 * Флажки целей спринтов в строках плана (QG8): цели всех спринтов команд квартала, привязанные к строкам.
 * Правка цели в сайдбаре (QG13) или на доске спринта обновляет кэш — флажки перерисуются сами.
 */
export function useQuarterlyPlanRowGoals(
  plan: QuarterlyPlan | null | undefined,
  weeks: readonly QuarterWeek[]
): ReadonlyMap<string, QuarterRowGoalFlag[]> {
  const forDemoPlanner = useDemoPlannerBoardsQueryScope();
  const targets = useMemo(
    () =>
      [...new Set((plan?.teams ?? []).flatMap((team) => team.sprints.map((sprint) => sprint.id)))].flatMap((sprintId) =>
        GOAL_TYPES.map((goalType) => ({ goalType, sprintId }))
      ),
    [plan?.teams]
  );
  const responses = useQueries({
    combine: (results) => results.map((result) => result.data),
    queries: targets.map(({ goalType, sprintId }) => ({
      queryFn: (): Promise<SprintGoalsResponse | null> => fetchSprintGoals(sprintId, goalType),
      queryKey: sprintGoalsQueryKey(forDemoPlanner, sprintId, goalType),
      staleTime: SPRINT_GOALS_STALE_MS,
    })),
  });
  return useMemo(() => {
    if (!plan) return new Map();
    const byKey = new Map(targets.map((target, index) => [`${target.sprintId}:${target.goalType}`, responses[index]]));
    return buildRowGoalFlags({
      goalsOf: (sprintId, goalType) =>
        byKey.get(`${sprintId}:${goalType}`)?.checklistItems.map((item) => ({ ...item, checked: Boolean(item.checked) })),
      ref: plan,
      rowIds: new Set([...plan.directions, ...plan.epics].map((row) => row.id)),
      teams: plan.teams,
      weeks,
    });
  }, [plan, responses, targets, weeks]);
}
