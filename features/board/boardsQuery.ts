import type { QueryClient } from '@tanstack/react-query';

export const boardsQueryKey = ['boards'] as const;

/**
 * Список досок строится из команд в БД; после CRUD в админке нужно сбрасывать кэш.
 * refetchType: 'all' — подтянуть данные даже если сейчас нет подписчиков на запрос
 * (глобально refetchOnMount: false).
 */
export function invalidateBoardsQuery(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: boardsQueryKey,
    refetchType: 'all',
  });
}
