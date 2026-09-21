'use client';

import type { BacklogResponse } from '@/types';

import { useQuery } from '@tanstack/react-query';

import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { fetchBacklog } from '@/lib/beerTrackerApi';

const BACKLOG_PER_PAGE = 50;

/** Ключ списка бэклога в React Query (должен совпадать с правками кэша в `useBacklogManagement`). */
export function backlogQueryKey(
  boardId: number | null,
  page: number,
  forDemoPlannerBoards: boolean
): readonly ['backlog', 'demo', number | null, number] | readonly ['backlog', number | null, number] {
  return forDemoPlannerBoards
    ? (['backlog', 'demo', boardId, page] as const)
    : (['backlog', boardId, page] as const);
}

/**
 * Хук для загрузки бэклога с кешированием через React Query
 */
export function useBacklog(boardId: number | null, page: number = 1) {
  const isDemoPlannerBoards = useDemoPlannerBoardsQueryScope();
  const queryKey = backlogQueryKey(boardId, page, isDemoPlannerBoards);

  return useQuery({
    queryKey: queryKey,
    queryFn: (): Promise<BacklogResponse> => {
      if (!boardId) {
        throw new Error('Board ID is required');
      }

      return fetchBacklog(boardId, page, BACKLOG_PER_PAGE);
    },
    enabled: !!boardId,
    staleTime: 1000 * 60 * 5, // 5 минут
  });
}

