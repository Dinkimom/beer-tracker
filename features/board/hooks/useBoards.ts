import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { boardSelectorLabel } from '@/features/board/boardSelectorLabel';
import { boardsQueryKey } from '@/features/board/boardsQuery';
import {
  demoPlannerBoardsQueryKey,
  useDemoPlannerBoardsQueryScope,
} from '@/features/board/demoPlannerBoardsQueryScope';
import { fetchBoards } from '@/lib/beerTrackerApi';

/**
 * Хук для получения списка досок, зарегистрированных в приложении
 */
export function useBoards() {
  const isDemoPlannerBoards = useDemoPlannerBoardsQueryScope();
  const boardsListQueryKey = isDemoPlannerBoards ? demoPlannerBoardsQueryKey : boardsQueryKey;

  const { data: boards = [], isLoading: boardsLoading } = useQuery({
    queryKey: boardsListQueryKey,
    queryFn: fetchBoards,
    staleTime: 30 * 60 * 1000, // 30 мин — доски редко меняются
    refetchOnMount: true, // глобально false; после инвалидации из админки подтянуть свежий список
    retry: isDemoPlannerBoards ? false : undefined,
  });

  const getBoardById = useCallback(
    (boardId: number | null) => {
      if (!boardId) return null;
      return boards.find((b) => b.id === boardId) ?? null;
    },
    [boards]
  );

  const getBoardName = useCallback(
    (boardId: number | null) => {
      const board = boards.find((b) => b.id === boardId);
      return board?.name ?? null;
    },
    [boards]
  );

  /** Для шапки / селектора: название команды (или доски, если команды нет). */
  const getBoardSelectorLabel = useCallback(
    (boardId: number | null) => {
      const board = boards.find((b) => b.id === boardId);
      return board ? boardSelectorLabel(board) : null;
    },
    [boards]
  );

  const getQueueByBoardId = useCallback(
    (boardId: number | null | undefined) => {
      if (!boardId) return null;
      const board = boards.find((b) => b.id === boardId);
      return board?.queue ?? null;
    },
    [boards]
  );

  const getTeamByBoardId = useCallback(
    (boardId: number | null | undefined) => {
      if (!boardId) return null;
      const board = boards.find((b) => b.id === boardId);
      return board?.team ?? null;
    },
    [boards]
  );

  return {
    boards,
    getBoardById,
    getBoardName,
    getBoardSelectorLabel,
    getQueueByBoardId,
    getTeamByBoardId,
    isLoading: boardsLoading,
  };
}
