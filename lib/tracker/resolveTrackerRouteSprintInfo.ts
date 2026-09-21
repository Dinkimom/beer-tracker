import type { SprintInfo, SprintListItem } from '@/types/tracker';

import { apiCache, cacheKeys } from '@/lib/cache';
import { sprintInfoFromListItem } from '@/lib/sprints/sprintInfoFromListItem';

export function resolveTrackerRouteSprintInfo(
  boardId: string | null,
  sprintId: number
): SprintInfo | null {
  const fromSprintInfoCache = apiCache.get<SprintInfo>(cacheKeys.sprintInfo(sprintId));
  if (fromSprintInfoCache) return fromSprintInfoCache;
  if (boardId == null || boardId.trim() === '') return null;
  const boardIdNum = Number.parseInt(boardId, 10);
  if (!Number.isFinite(boardIdNum)) return null;
  const list = apiCache.get<SprintListItem[]>(cacheKeys.sprints(boardIdNum));
  if (!Array.isArray(list)) return null;
  const item = list.find((sprint) => sprint.id === sprintId);
  return item ? sprintInfoFromListItem(item) : null;
}
