'use client';

import { useQuery } from '@tanstack/react-query';

import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { fetchBoardSprintMetrics } from '@/lib/api/sprintMetrics';

/** Пока сервер досчитывает историю (`pending > 0`), запрос повторяется. */
const PENDING_REFETCH_MS = 3000;

export function useBoardSprintMetrics(boardId: number | null, quarters: number) {
  const isDemo = useDemoPlannerBoardsQueryScope();
  return useQuery({
    queryKey: isDemo
      ? (['sprint-metrics', 'demo', boardId, quarters] as const)
      : (['sprint-metrics', boardId, quarters] as const),
    queryFn: () => fetchBoardSprintMetrics(boardId as number, quarters),
    enabled: boardId != null,
    staleTime: 5 * 60 * 1000,
    refetchInterval: (query) => ((query.state.data?.pending ?? 0) > 0 ? PENDING_REFETCH_MS : false),
  });
}
