import type { SyncJobMode } from './types';
import type { IssueTrackerProviderClient, IssueTrackerProviderKind, IssueTrackerIssue } from '@/lib/issueTrackerProvider/types';
import type { OrganizationRow } from '@/lib/organizations/types';
import type { ResolvedOrgSyncSettings } from '@/lib/orgSyncSettings';

import { issueTrackerStoredProvider } from '@/lib/issueTrackerProvider/types';
import { yandexIssueFromProviderIssue } from '@/lib/issueTrackerProvider/yandexTrackerProvider';
import { updateOrganization } from '@/lib/organizations';
import { upsertIssueSnapshotsForOrg } from '@/lib/snapshots';

import { runChangelogSyncWithProgress } from './runChangelogSyncWithProgress';
import {
  finishSyncRun,
  mergeSyncRunStats,
  type SyncRunTerminalStatus,
} from './syncRunsRepository';
import { WATERMARK_UNTIL_STATS_KEY } from './watermark';

export async function failFullSyncWithNoQueues(input: {
  mode: Extract<SyncJobMode, 'full_rescan' | 'initial_full'>;
  onProgress?: (percent: number, meta?: Record<string, unknown>) => Promise<void> | void;
  syncRunId: string;
}): Promise<{ finalStatus: SyncRunTerminalStatus; syncRunId: string }> {
  await mergeSyncRunStats(input.syncRunId, {
    no_queues: true,
    phase: 'no_queues',
    queues_total: 0,
  });
  await finishSyncRun({
    errorSummary:
      'Нет очередей для импорта. Добавьте команды с привязкой к очереди трекера (tracker_queue_key).',
    extraStats: {
      issues_fetched: 0,
      issues_upserted: 0,
      mode: input.mode,
      no_queues: true,
      queues_processed: 0,
      queues_total: 0,
    },
    status: 'failed',
    syncRunId: input.syncRunId,
  });
  await input.onProgress?.(100, { phase: 'failed', reason: 'no_queues' });
  return { finalStatus: 'failed', syncRunId: input.syncRunId };
}

function buildFullSyncCheckpointMeta(
  checkpoint: Record<string, unknown>,
  issuesSoFar: number
): { meta: Record<string, unknown>; pct: number } {
  const queueIndex = Number(checkpoint.queue_index);
  const queueTotal = Number(checkpoint.queue_total);
  const page = Number(checkpoint.page);
  const totalPages = Math.max(1, Number(checkpoint.total_pages));
  const queueSpan = 36;
  const queueWeight = queueTotal > 0 ? (queueIndex - 1 + page / totalPages) / queueTotal : 0;
  const pct = Math.min(54, Math.round(18 + queueSpan * queueWeight));
  const meta: Record<string, unknown> = {
    page,
    phase: 'fetch_queues',
    queueIndex,
    queueKey: checkpoint.queue_key,
    queueTotal,
    totalPages,
  };
  if (Number.isFinite(issuesSoFar)) {
    meta.issuesCollected = issuesSoFar;
  }
  return { pct, meta };
}

export async function reportFullSyncCheckpointProgress(
  patch: Record<string, unknown>,
  onProgress?: (percent: number, meta?: Record<string, unknown>) => Promise<void> | void
): Promise<void> {
  const checkpoint = patch.full_sync_checkpoint;
  if (checkpoint == null || typeof checkpoint !== 'object' || Array.isArray(checkpoint)) {
    return;
  }
  const { pct, meta } = buildFullSyncCheckpointMeta(
    checkpoint as Record<string, unknown>,
    Number(patch.issues_total_so_far)
  );
  await onProgress?.(pct, meta);
}

export async function upsertFullSyncIssuesAndChangelog(input: {
  issueTracker: IssueTrackerProviderClient;
  issues: IssueTrackerIssue[];
  onProgress?: (percent: number, meta?: Record<string, unknown>) => Promise<void> | void;
  orgId: string;
  providerKind: IssueTrackerProviderKind;
  queuesProcessed: number;
  queuesTotal: number;
  syncRunId: string;
}): Promise<{ changelogUpserted: number; upserted: number }> {
  await input.onProgress?.(58, {
    phase: 'upsert_start',
    queues_done: input.queuesProcessed,
    queues_total: input.queuesTotal,
  });
  const upserted = await upsertIssueSnapshotsForOrg(
    input.orgId,
    input.issues.map(yandexIssueFromProviderIssue),
    { provider: issueTrackerStoredProvider(input.providerKind) }
  );
  const changelogKeys = input.issues
    .map((issue) => issue.key)
    .filter((key): key is string => typeof key === 'string' && key.length > 0);
  const changelogUpserted = await runChangelogSyncWithProgress({
    firstProgressExtra: { issues_upserted: upserted },
    issueKeys: changelogKeys,
    issueTracker: input.issueTracker,
    onProgress: input.onProgress,
    organizationId: input.orgId,
    percentFrom: 68,
    percentTo: 88,
    syncRunId: input.syncRunId,
  });
  await input.onProgress?.(88, {
    changelog_rows_upserted: changelogUpserted,
    issues_upserted: upserted,
    phase: 'upsert_done',
  });
  return { changelogUpserted, upserted };
}

async function applySuccessfulFullSyncOrgUpdate(input: {
  buildSettingsWithSyncPatch: (
    root: Record<string, unknown>,
    syncPatch: Record<string, unknown>
  ) => Record<string, unknown>;
  computeSyncNextRunAtFromNow: (settings: ResolvedOrgSyncSettings) => Date;
  mode: Extract<SyncJobMode, 'full_rescan' | 'initial_full'>;
  org: OrganizationRow;
  settings: ResolvedOrgSyncSettings;
  until: Date;
}): Promise<void> {
  if (input.mode === 'initial_full') {
    await updateOrganization(input.org.id, {
      initial_sync_completed_at: input.until,
      sync_next_run_at: input.computeSyncNextRunAtFromNow(input.settings),
    });
    return;
  }
  await updateOrganization(input.org.id, {
    ...(input.org.initial_sync_completed_at == null ? { initial_sync_completed_at: input.until } : {}),
    settings: input.buildSettingsWithSyncPatch(input.org.settings as Record<string, unknown>, {
      lastFullRescanAt: input.until.toISOString(),
    }),
    sync_next_run_at: input.computeSyncNextRunAtFromNow(input.settings),
  });
}

export async function finalizeFullSyncRun(input: {
  buildSettingsWithSyncPatch: (
    root: Record<string, unknown>,
    syncPatch: Record<string, unknown>
  ) => Record<string, unknown>;
  changelogUpserted: number;
  computeSyncNextRunAtFromNow: (settings: ResolvedOrgSyncSettings) => Date;
  issuesFetched: number;
  mode: Extract<SyncJobMode, 'full_rescan' | 'initial_full'>;
  onProgress?: (percent: number, meta?: Record<string, unknown>) => Promise<void> | void;
  org: OrganizationRow;
  queuesProcessed: number;
  queuesTotal: number;
  settings: ResolvedOrgSyncSettings;
  syncRunId: string;
  truncated: boolean;
  upserted: number;
}): Promise<{ finalStatus: SyncRunTerminalStatus; syncRunId: string }> {
  const until = new Date();
  const terminal: SyncRunTerminalStatus = input.truncated ? 'partial' : 'success';
  const successful = terminal === 'success' && !input.truncated;

  if (successful) {
    await applySuccessfulFullSyncOrgUpdate({ ...input, until });
  }

  await finishSyncRun({
    extraStats: {
      [WATERMARK_UNTIL_STATS_KEY]: until.toISOString(),
      changelog_rows_upserted: input.changelogUpserted,
      issues_fetched: input.issuesFetched,
      issues_upserted: input.upserted,
      mode: input.mode,
      queues_processed: input.queuesProcessed,
      queues_total: input.queuesTotal,
      truncated: input.truncated,
    },
    status: terminal,
    syncRunId: input.syncRunId,
  });
  await input.onProgress?.(100);
  return { finalStatus: terminal, syncRunId: input.syncRunId };
}
