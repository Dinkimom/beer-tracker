import { useQuery } from '@tanstack/react-query';

import { fetchBoard } from '@/lib/beerTrackerApi';

/** `columns` сбрасывает залипший в localStorage ответ без колонок (`['board', id]`). */
function boardParamsQueryKey(boardId: number) {
  return ['board', 'columns', boardId] as const;
}

/** Параметры доски (колонки канбана). Колонки редко меняются — длинный staleTime. */
export function useBoardParams(boardId: number | null) {
  return useQuery({
    queryKey: boardParamsQueryKey(boardId ?? 0),
    queryFn: async () => {
      const board = await fetchBoard(boardId!);
      if (!Array.isArray(board?.columns) || board.columns.length === 0) {
        throw new Error('Board columns are missing');
      }
      return board;
    },
    enabled: boardId !== null && boardId > 0,
    staleTime: 30 * 60 * 1000,
  });
}
