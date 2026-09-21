'use client';

import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { useQuery } from '@tanstack/react-query';

import { fetchBoardAvailabilityEventsForBoard } from '@/lib/beerTrackerApi';

export function useBoardAvailabilityEvents(boardId: number | null) {
  return useQuery({
    queryKey: ['boardAvailabilityEvents', boardId],
    queryFn: async (): Promise<BoardAvailabilityEvent[]> => {
      if (!boardId) return [];
      return await fetchBoardAvailabilityEventsForBoard(boardId);
    },
    enabled: boardId != null,
    staleTime: 1000 * 60 * 2,
  });
}
