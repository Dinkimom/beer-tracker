'use client';

import type { StoryEventsByStory, StoryPhasesByStory } from '../types';
import type { Quarter } from '@/types';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
  fetchQuarterlyPlanV2,
  saveQuarterlyPlanV2,
  type QuarterlyPlanV2Response,
} from '@/lib/api/quarterly';

const QUERY_KEY = ['quarterly-plan-v2'] as const;

/**
 * @deprecated Квартальный план v2 не развивается.
 * Загрузка и сохранение плана. При смене boardId / year / quarter загружается соответствующий план.
 */
export function useQuarterlyPlanV2(
  boardId: number,
  year: number,
  quarter: Quarter
) {
  const queryClient = useQueryClient();
  const quarterNum = typeof quarter === 'number' ? quarter : parseInt(String(quarter), 10);

  const query = useQuery({
    queryKey: [...QUERY_KEY, boardId, year, quarterNum],
    queryFn: () => fetchQuarterlyPlanV2(boardId, year, quarterNum),
    enabled: !!boardId && !!year && quarterNum >= 1 && quarterNum <= 4,
  });

  const saveMutation = useMutation({
    mutationFn: ({
      epicKeys,
      storyPhases,
      storyEvents,
      excludedStoryKeys,
    }: {
      epicKeys: string[];
      excludedStoryKeys: string[];
      storyEvents: StoryEventsByStory;
      storyPhases: StoryPhasesByStory;
    }) =>
      saveQuarterlyPlanV2(
        boardId,
        year,
        quarterNum,
        epicKeys,
        storyPhases,
        excludedStoryKeys,
        storyEvents
      ),
    onSuccess: (_data, variables) => {
      const queryKey = [...QUERY_KEY, boardId, year, quarterNum] as const;
      queryClient.setQueryData<QuarterlyPlanV2Response | undefined>(queryKey, (prev) =>
        prev
          ? {
              ...prev,
              epicKeys: variables.epicKeys,
              excludedStoryKeys: variables.excludedStoryKeys,
              storyPhases: variables.storyPhases,
              storyEvents: variables.storyEvents,
            }
          : prev
      );
      queryClient.invalidateQueries({ queryKey: [...queryKey] }).catch((error) => {
        console.error('Failed to invalidate quarterly plan query:', error);
      });
    },
  });

  const savePlan = useCallback(
    (
      epicKeys: string[],
      storyPhases: StoryPhasesByStory,
      excludedStoryKeys: string[] = [],
      storyEvents: StoryEventsByStory = {}
    ) =>
      saveMutation.mutateAsync({
        epicKeys,
        storyPhases,
        storyEvents,
        excludedStoryKeys,
      }),
    [saveMutation]
  );

  return {
    planData: query.data,
    isLoadingPlan: query.isLoading,
    refetchPlan: query.refetch,
    savePlan,
    isSaving: saveMutation.isPending,
  };
}
