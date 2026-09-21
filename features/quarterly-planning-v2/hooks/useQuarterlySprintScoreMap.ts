'use client';

import type { QuarterlySprintInfo } from '../types';
import type { QuarterlySprintScoreEntry } from '../utils/quarterlySprintScore';

import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchSprintScore } from '@/lib/api/sprints';

import {
  isFrozenQuarterlySprintMetrics,
  parseQuarterlySprintId,
  quarterlySprintMetricsQueryOptions,
} from '../utils/quarterlySprintMetricsCache';
import { pickQuarterlySprintScoreEntry } from '../utils/quarterlySprintScore';

import { mergeQuarterlySprintScoreQueries } from './useQuarterlySprintScoreMapHelpers';

export interface QuarterlySprintScoreMapResult {
  hideTp: boolean;
  scoresBySprintId: Map<number, QuarterlySprintScoreEntry>;
}

export function useQuarterlySprintScoreMap(sprintInfos: QuarterlySprintInfo[]) {
  const queries = useQueries({
    queries: sprintInfos.map((sprint) => {
      const sprintId = parseQuarterlySprintId(sprint);
      const frozen = isFrozenQuarterlySprintMetrics(sprint);
      const cache = quarterlySprintMetricsQueryOptions(frozen);

      return {
        queryKey: ['quarterlySprintScore', sprintId] as const,
        queryFn: async () => {
          const { rows, testingFlowMode } = await fetchSprintScore(sprintId);
          return {
            sprintId,
            hideTp: testingFlowMode === 'standalone_qa_tasks',
            entry: pickQuarterlySprintScoreEntry(rows),
          };
        },
        enabled: sprintId > 0,
        ...cache,
      };
    }),
  });

  const data = useMemo(
    (): QuarterlySprintScoreMapResult | undefined => mergeQuarterlySprintScoreQueries(queries),
    [queries]
  );

  return {
    data,
    isLoading: queries.length > 0 && queries.some((q) => q.isLoading),
    isFetching: queries.some((q) => q.isFetching),
    isError: queries.some((q) => q.isError),
  };
}
