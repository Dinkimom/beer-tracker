import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';
import type { SprintListItem } from '@/types/tracker';

import { apiCache, cacheKeys } from '@/lib/cache';

/** Как у GET /api/sprints: список спринтов доски меняется редко, трекер дёргать незачем. */
const SPRINTS_CACHE_TTL_SECONDS = 10 * 60;

/** Спринты доски из трекера с кэшем на 10 минут. Пустой ответ не кэшируется. Ошибка трекера — наверх. */
export async function listBoardSprintsCached(
  issueTracker: Pick<IssueTrackerProviderClient, 'listSprints' | 'organizationId'>,
  boardId: number
): Promise<SprintListItem[]> {
  const cacheKey = cacheKeys.sprints(issueTracker.organizationId, boardId);
  const cached = apiCache.get<SprintListItem[]>(cacheKey);
  if (cached) return cached;
  const sprints = await issueTracker.listSprints(boardId);
  if (sprints.length > 0) apiCache.set(cacheKey, sprints, SPRINTS_CACHE_TTL_SECONDS);
  return sprints;
}
