'use client';

import type { QuarterlySprintInfo } from '../types';
import type { SprintGoalsSummary } from '../utils/quarterlySprintGoals';

import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchSprintGoals } from '@/lib/api/sprintGoals';

import { mergeSprintGoalsResponses } from '../utils/quarterlySprintGoals';
import {
  isFrozenQuarterlySprintMetrics,
  parseQuarterlySprintId,
  quarterlySprintMetricsQueryOptions,
} from '../utils/quarterlySprintMetricsCache';

interface SprintGoalsQueryResult {
  data?: { sprintId: number; summary: SprintGoalsSummary };
  isLoading: boolean;
}

function applySprintGoalsQueryRow(
  map: Map<number, SprintGoalsSummary>,
  query: SprintGoalsQueryResult
): boolean {
  if (!query.data) return false;
  map.set(query.data.sprintId, query.data.summary);
  return true;
}

function mergeQuarterlySprintGoalsQueries(
  queries: SprintGoalsQueryResult[]
): Map<number, SprintGoalsSummary> | undefined {
  if (queries.length === 0) return undefined;

  const map = new Map<number, SprintGoalsSummary>();
  let hasAnyData = false;

  for (const query of queries) {
    hasAnyData = applySprintGoalsQueryRow(map, query) || hasAnyData;
  }

  if (!hasAnyData && queries.some((q) => q.isLoading)) return undefined;
  return map;
}

async function fetchMergedSprintGoals(sprintId: number): Promise<SprintGoalsSummary> {
  const [delivery, discovery] = await Promise.all([
    fetchSprintGoals(sprintId, 'delivery'),
    fetchSprintGoals(sprintId, 'discovery'),
  ]);
  return mergeSprintGoalsResponses(delivery, discovery);
}

export function useQuarterlySprintGoalsMap(sprintInfos: QuarterlySprintInfo[]) {
  const queries = useQueries({
    queries: sprintInfos.map((sprint) => {
      const sprintId = parseQuarterlySprintId(sprint);
      const frozen = isFrozenQuarterlySprintMetrics(sprint);
      const cache = quarterlySprintMetricsQueryOptions(frozen);

      return {
        queryKey: ['quarterlySprintGoals', sprintId] as const,
        queryFn: async () => ({
          sprintId,
          summary: await fetchMergedSprintGoals(sprintId),
        }),
        enabled: sprintId > 0,
        ...cache,
      };
    }),
  });

  const data = useMemo(
    (): Map<number, SprintGoalsSummary> | undefined => mergeQuarterlySprintGoalsQueries(queries),
    [queries]
  );

  return {
    data,
    isLoading: queries.length > 0 && queries.some((q) => q.isLoading),
    isFetching: queries.some((q) => q.isFetching),
    isError: queries.some((q) => q.isError),
  };
}
