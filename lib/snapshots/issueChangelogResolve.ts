/**
 * Сборка ответа batch changelog: кеш PostgreSQL + при необходимости issue tracker provider.
 */

import type { IssueChangelogWithComments } from '@/types/tracker';

const empty: IssueChangelogWithComments = { changelog: [], comments: [] };

/** Ответ batch по списку ключей из уже загруженного кеша (без запросов к Tracker). */
export function issueChangelogBatchRecordFromCacheMap(
  issueKeys: string[],
  cache: Map<string, IssueChangelogWithComments>
): Record<string, IssueChangelogWithComments> {
  const out: Record<string, IssueChangelogWithComments> = {};
  for (const k of issueKeys) {
    out[k] = cache.get(k) ?? empty;
  }
  return out;
}
