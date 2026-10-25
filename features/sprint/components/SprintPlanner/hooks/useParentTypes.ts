import { useQuery } from '@tanstack/react-query';

import { fetchParentStatusesAndTypes } from './useParentStatuses';

/**
 * Загружает типы родительских задач (epic, story и т.д.) из issue_snapshots.
 * Использует тот же запрос, что и useParentStatuses (один запрос, общий кэш).
 */
export function useParentTypes(parentKeys: string[]) {
  const uniqueKeys = [...new Set(parentKeys)].filter(Boolean);

  return useQuery({
    queryKey: ['parentStatuses', uniqueKeys.sort().join(',')],
    queryFn: () => fetchParentStatusesAndTypes(uniqueKeys),
    enabled: uniqueKeys.length > 0,
    staleTime: 2 * 60 * 1000,
    select: (data) => data.types,
  });
}
