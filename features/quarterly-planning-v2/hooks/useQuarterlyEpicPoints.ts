'use client';

import type { BurndownTilesFromTasks } from '@/features/sprint/utils/sprintMetrics';

import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchEpicTasks } from '@/lib/api/epics';

import { computeEpicBurndownTiles } from '../utils/quarterlyEpicPoints';

export interface QuarterlyEpicPointsBundle {
  isLoading: boolean;
  tiles: BurndownTilesFromTasks | null;
}

async function loadEpicBurndownTiles(
  epicKey: string,
  boardId: number
): Promise<BurndownTilesFromTasks> {
  const raw = await fetchEpicTasks(epicKey, boardId);
  const childTasks = raw.filter((t) => !t.originalTaskId);
  return computeEpicBurndownTiles(childTasks);
}

export function useQuarterlyEpicPointsByKey(boardId: number, epicKeys: string[]) {
  const queries = useQueries({
    queries: epicKeys.map((key) => ({
      queryKey: ['quarterlyEpicPoints', boardId, key] as const,
      queryFn: () => loadEpicBurndownTiles(key, boardId),
      enabled: boardId > 0 && key.length > 0,
      staleTime: 2 * 60 * 1000,
    })),
  });

  return useMemo(() => {
    const map = new Map<string, QuarterlyEpicPointsBundle>();
    epicKeys.forEach((key, index) => {
      const query = queries[index];
      map.set(key, {
        isLoading: query?.isLoading ?? false,
        tiles: query?.data ?? null,
      });
    });
    return map;
  }, [epicKeys, queries]);
}
