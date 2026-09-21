/**
 * Загрузка ченжлога+комментариев в кеш с прогрессом (Bull job + sync_runs.stats).
 */

import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';

import { syncIssueChangelogsFromTrackerForKeys } from '@/lib/snapshots';

import { mergeSyncRunStats } from './syncRunsRepository';

type RunChangelogSyncWithProgressOnProgress = (
  percent: number,
  meta?: Record<string, unknown>
) => Promise<void> | void;

export async function runChangelogSyncWithProgress(input: {
  /** Доп. поля только для первого события прогресса (например issues_upserted после снимков). */
  firstProgressExtra?: Record<string, unknown>;
  issueKeys: string[];
  issueTracker: IssueTrackerProviderClient;
  onProgress?: RunChangelogSyncWithProgressOnProgress;
  organizationId: string;
  percentFrom: number;
  percentTo: number;
  syncRunId: string;
}): Promise<number> {
  const {
    firstProgressExtra,
    issueKeys,
    issueTracker,
    onProgress,
    organizationId,
    percentFrom,
    percentTo,
    syncRunId,
  } = input;

  const keys = [...new Set(issueKeys.filter((k) => k.trim().length > 0))];
  const batchSize = 100;
  const batchTotal = keys.length === 0 ? 0 : Math.ceil(keys.length / batchSize);
  const span = percentTo - percentFrom;

  const emit = async (p: {
    batchIndex: number;
    batchTotal: number;
    keysDone: number;
    keysTotal: number;
    useFirstExtra: boolean;
  }) => {
    let pct: number;
    if (p.keysTotal <= 0) {
      pct = percentTo;
    } else if (p.keysDone === 0) {
      pct = percentFrom;
    } else {
      pct = Math.min(
        percentTo,
        Math.round(percentFrom + (span * p.keysDone) / p.keysTotal)
      );
    }

    const meta: Record<string, unknown> = {
      phase: 'changelog_fetch',
      changelogBatchIndex: p.batchIndex,
      changelogBatchTotal: p.batchTotal,
      changelogKeysDone: p.keysDone,
      changelogKeysTotal: p.keysTotal,
      ...(p.useFirstExtra && firstProgressExtra != null ? firstProgressExtra : {}),
    };

    await onProgress?.(pct, meta);
    await mergeSyncRunStats(syncRunId, {
      changelog_fetch: {
        batch_index: p.batchIndex,
        batch_total: p.batchTotal,
        keys_done: p.keysDone,
        keys_total: p.keysTotal,
      },
      phase: 'changelog_fetch',
    });
  };

  await emit({
    batchIndex: 0,
    batchTotal,
    keysDone: 0,
    keysTotal: keys.length,
    useFirstExtra: true,
  });

  return syncIssueChangelogsFromTrackerForKeys(
    organizationId,
    issueKeys,
    issueTracker,
    async (batch) => {
      await emit({
        batchIndex: batch.batchIndex,
        batchTotal: batch.batchTotal,
        keysDone: batch.keysDone,
        keysTotal: batch.keysTotal,
        useFirstExtra: false,
      });
    }
  );
}
