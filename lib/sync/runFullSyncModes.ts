/**
 * initial_full / full_rescan: очереди команд, пагинация, чекпоинты в sync_runs.stats, обновление org.
 */

import type { SyncJobMode } from './types';
import type { SyncPlatformEnv } from '@/lib/env';
import type { IssueTrackerProviderClient, IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';
import type { OrganizationRow } from '@/lib/organizations/types';
import type { ResolvedOrgSyncSettings } from '@/lib/orgSyncSettings';

import { extractOrgSyncSettingsJson } from '@/lib/orgSyncSettings';
import { listTeams } from '@/lib/staffTeams/teamsRepository';
import { TRACKER_ISSUES_SEARCH_PER_PAGE_CAP } from '@/lib/trackerApi/issuesFetchHelpers';

import {
  collectIssuesFullSyncAcrossQueues,
  uniqueQueueKeysFromTeams,
} from './fullOrgBoardScan';
import {
  failFullSyncWithNoQueues,
  finalizeFullSyncRun,
  reportFullSyncCheckpointProgress,
  upsertFullSyncIssuesAndChangelog,
} from './runFullSyncModesHelpers';
import { mergeSyncRunStats, type SyncRunTerminalStatus } from './syncRunsRepository';

function computeSyncNextRunAtFromNow(settings: ResolvedOrgSyncSettings): Date {
  return new Date(Date.now() + settings.intervalMinutes * 60_000);
}

function buildSettingsWithSyncPatch(
  root: Record<string, unknown>,
  syncPatch: Record<string, unknown>
): Record<string, unknown> {
  const rawSync = extractOrgSyncSettingsJson(root);
  const syncObj =
    rawSync !== null && typeof rawSync === 'object' && !Array.isArray(rawSync)
      ? { ...(rawSync as Record<string, unknown>) }
      : {};
  return {
    ...root,
    sync: { ...syncObj, ...syncPatch },
  };
}

export async function runFullSyncModes(params: {
  issueTracker: IssueTrackerProviderClient;
  mode: Extract<SyncJobMode, 'full_rescan' | 'initial_full'>;
  onProgress?: (percent: number, meta?: Record<string, unknown>) => Promise<void> | void;
  org: OrganizationRow;
  platform: SyncPlatformEnv;
  providerKind: IssueTrackerProviderKind;
  settings: ResolvedOrgSyncSettings;
  syncRunId: string;
}): Promise<{ finalStatus: SyncRunTerminalStatus; syncRunId: string }> {
  const { issueTracker, mode, onProgress, org, platform, providerKind, settings, syncRunId } =
    params;

  const queueKeys = uniqueQueueKeysFromTeams(await listTeams(org.id, { activeOnly: true }));
  await onProgress?.(12, { phase: 'list_queues', queues_total: queueKeys.length });
  if (queueKeys.length === 0) {
    return failFullSyncWithNoQueues({ mode, onProgress, syncRunId });
  }

  await onProgress?.(18, { phase: 'fetch_start', queues_total: queueKeys.length });
  const perPage = Math.min(settings.maxIssuesPerRun, TRACKER_ISSUES_SEARCH_PER_PAGE_CAP);
  const { issues, queuesProcessed, truncated } = await collectIssuesFullSyncAcrossQueues({
    issueTracker,
    maxTotalIssues: platform.fullSyncMaxIssuesPerRun,
    mergeStats: async (patch) => {
      await mergeSyncRunStats(syncRunId, patch);
      await reportFullSyncCheckpointProgress(patch, onProgress);
    },
    perPage,
    queueKeys,
  });

  const { changelogUpserted, upserted } = await upsertFullSyncIssuesAndChangelog({
    issueTracker,
    issues,
    onProgress,
    orgId: org.id,
    providerKind,
    queuesProcessed,
    queuesTotal: queueKeys.length,
    syncRunId,
  });

  return finalizeFullSyncRun({
    buildSettingsWithSyncPatch,
    changelogUpserted,
    computeSyncNextRunAtFromNow,
    issuesFetched: issues.length,
    mode,
    onProgress,
    org,
    queuesProcessed,
    queuesTotal: queueKeys.length,
    settings,
    syncRunId,
    truncated,
    upserted,
  });
}
