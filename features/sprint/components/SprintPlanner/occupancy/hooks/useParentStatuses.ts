import { useQuery } from '@tanstack/react-query';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

interface ParentStatusesAndTypes {
  statuses: Map<string, string>;
  summaries: Map<string, string>;
  types: Map<string, string>;
}

/**
 * Загружает статусы, типы и названия родительских задач из снимков в PostgreSQL одним запросом.
 * Экспортируется для использования в useParentTypes (общий кэш) и usePlannedInSprintPositions.
 */
export function fetchParentStatusesAndTypes(
  uniqueKeys: string[]
): Promise<ParentStatusesAndTypes> {
  if (uniqueKeys.length === 0) {
    return Promise.resolve({ statuses: new Map(), types: new Map(), summaries: new Map() });
  }
  return getPlannerBeerTrackerApi()
    .post<{
      statuses: Record<string, string>;
      types: Record<string, string>;
      summaries?: Record<string, string>;
    }>('/issues/parent-statuses', { issueKeys: uniqueKeys })
    .then(({ data }) => ({
      statuses: new Map(Object.entries(data.statuses ?? {})),
      types: new Map(Object.entries(data.types ?? {})),
      summaries: new Map(Object.entries(data.summaries ?? {})),
    }));
}

/**
 * Загружает актуальные статусы родительских задач из снимков (tenant).
 */
export function useParentStatuses(parentKeys: string[]) {
  const uniqueKeys = [...new Set(parentKeys)].filter(Boolean);

  return useQuery({
    queryKey: ['parentStatuses', uniqueKeys.sort().join(',')],
    queryFn: () => fetchParentStatusesAndTypes(uniqueKeys),
    enabled: uniqueKeys.length > 0,
    staleTime: 2 * 60 * 1000,
    select: (data) => data.statuses,
  });
}
