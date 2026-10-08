import { useQuery } from '@tanstack/react-query';

import { boardParamsQueryKey } from '@/features/board/boardParamsQuery';
import { fetchBoard } from '@/lib/beerTrackerApi';

/** Параметры доски (колонки канбана). Колонки редко меняются — длинный staleTime. */
export function useBoardParams(boardId: number | null) {
  return useQuery({
    queryKey: boardParamsQueryKey(boardId ?? 0),
    queryFn: () => fetchBoard(boardId!),
    enabled: boardId !== null && boardId > 0,
    staleTime: 30 * 60 * 1000,
  });
}
