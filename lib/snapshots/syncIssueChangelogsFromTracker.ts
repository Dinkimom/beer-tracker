/**
 * Подтягивает changelog+comments из issue tracker provider и пишет в issue_changelog_events.
 */

import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';

import { upsertIssueChangelogCacheBatchForOrg } from './issueChangelogWrite';

const BATCH_KEYS = 100;

interface IssueChangelogSyncBatchProgress {
  batchIndex: number;
  batchTotal: number;
  keysDone: number;
  keysTotal: number;
}

/**
 * Для каждого ключа — полный changelog и комментарии (как у batch API), затем upsert в БД.
 */
export async function syncIssueChangelogsFromTrackerForKeys(
  organizationId: string,
  issueKeys: string[],
  issueTracker: IssueTrackerProviderClient,
  onBatchProgress?: (p: IssueChangelogSyncBatchProgress) => Promise<void> | void
): Promise<number> {
  const unique = [...new Set(issueKeys.filter((k) => k.trim().length > 0))];
  const batchTotal = unique.length === 0 ? 0 : Math.ceil(unique.length / BATCH_KEYS);
  let upserted = 0;
  for (let i = 0; i < unique.length; i += BATCH_KEYS) {
    const chunk = unique.slice(i, i + BATCH_KEYS);
    const batchIndex = Math.floor(i / BATCH_KEYS) + 1;
    const dataMap = await issueTracker.getIssuesChangelogBatch(chunk);
    const rows = chunk.map((issueKey) => ({
      issueKey,
      data: dataMap[issueKey] ?? { changelog: [], comments: [] },
    }));
    upserted += await upsertIssueChangelogCacheBatchForOrg(organizationId, rows);
    const keysDone = Math.min(i + chunk.length, unique.length);
    await onBatchProgress?.({
      batchIndex,
      batchTotal,
      keysDone,
      keysTotal: unique.length,
    });
  }
  return upserted;
}
