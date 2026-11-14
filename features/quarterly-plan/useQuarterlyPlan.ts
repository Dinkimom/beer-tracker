'use client';

import type {
  QuarterlyPlan,
  QuarterlyPlanContent,
  QuarterRef,
} from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import {
  fetchBoardAvailabilityEventsForBoard,
  fetchQuarterlyPlan,
  saveQuarterlyPlan,
} from '@/lib/beerTrackerApi';

const AVAILABILITY_STALE_MS = 2 * 60 * 1000;

/**
 * План квартала и отсутствия команд. Отсутствия лежат в том же кэше, что у доски спринта
 * (`boardAvailabilityEvents`), поэтому правка на одном экране сразу видна на другом.
 */
export function useQuarterlyPlan(ref: QuarterRef) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { quarter, year } = ref;
  const queryKey = useMemo(() => ['quarterlyPlan', year, quarter] as const, [quarter, year]);

  const planQuery = useQuery({
    queryFn: () => fetchQuarterlyPlan({ quarter, year }),
    queryKey,
  });
  const plan = planQuery.data ?? null;

  const boardIds = useMemo(() => (plan?.teams ?? []).map((team) => team.boardId), [plan]);
  const eventsByBoard = useQueries({
    combine: (results) => {
      const map = new Map<number, BoardAvailabilityEvent[]>();
      results.forEach((result, index) => map.set(boardIds[index]!, result.data ?? []));
      return map;
    },
    queries: boardIds.map((boardId) => ({
      queryFn: () => fetchBoardAvailabilityEventsForBoard(boardId),
      queryKey: ['boardAvailabilityEvents', boardId],
      staleTime: AVAILABILITY_STALE_MS,
    })),
  });

  const applyEdit = useCallback(
    (edit: (content: QuarterlyPlanContent) => QuarterlyPlanContent) => {
      const current = queryClient.getQueryData<QuarterlyPlan>(queryKey);
      if (!current) return;
      const content = edit(current);
      const { assignments, directions, epics, links, notes } = content;
      queryClient.setQueryData<QuarterlyPlan>(queryKey, { ...current, assignments, directions, epics, links, notes });
      saveQuarterlyPlan({ quarter, year }, { assignments, directions, epics, links, notes }).catch(() => {
        toast.error(t('quarterlyPlan.saveError'));
        queryClient.invalidateQueries({ queryKey }).catch(() => undefined);
      });
    },
    [quarter, queryClient, queryKey, t, year]
  );

  return { applyEdit, eventsByBoard, isLoading: planQuery.isLoading, plan };
}
