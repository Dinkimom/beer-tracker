/**
 * Ядро синхронизации организации: sync_runs, инкремент (watermark + overlap), вызов Tracker с серверным токеном.
 */

import type { SyncJobMode } from './types';

import {
  executeStartedOrgSync,
  loadOrgSyncRunContext,
  resolveOrgSyncToken,
} from './runOrgSyncHelpers';
import {
  failRunningSyncRunForBullJob,
  tryBeginSyncRun,
  type SyncRunTerminalStatus,
} from './syncRunsRepository';

type RunOrgSyncSkippedReason =
  | 'concurrent_sync'
  | 'incremental_before_initial'
  | 'invalid_sync_settings'
  | 'missing_tracker_org_id'
  | 'missing_tracker_token'
  | 'sync_disabled';

export type RunOrgSyncResult =
  | { finalStatus: SyncRunTerminalStatus; status: 'ok'; syncRunId: string }
  | { message?: string; reason: RunOrgSyncSkippedReason; status: 'skipped' };

export interface RunOrgSyncInput {
  bullJobId?: string;
  mode: SyncJobMode;
  organizationId: string;
  onProgress?: (percent: number, meta?: Record<string, unknown>) => Promise<void> | void;
}

function syncRunBeginParams(input: RunOrgSyncInput, organizationId: string) {
  return {
    initialStats: {
      ...(input.bullJobId != null ? { bull_job_id: input.bullJobId } : {}),
      mode: input.mode,
    },
    jobType: input.mode,
    organizationId,
  };
}

async function beginOrgSyncRun(input: RunOrgSyncInput, organizationId: string) {
  const params = syncRunBeginParams(input, organizationId);
  const began = await tryBeginSyncRun(params);
  if (began.ok || input.bullJobId == null) {
    return began;
  }
  const reclaimed = await failRunningSyncRunForBullJob(organizationId, input.bullJobId);
  if (!reclaimed) {
    return began;
  }
  return tryBeginSyncRun(params);
}

export async function runOrgSync(input: RunOrgSyncInput): Promise<RunOrgSyncResult> {
  const context = await loadOrgSyncRunContext(input);
  if ('status' in context) {
    return context;
  }
  const { org, platform, settings } = context;

  const tokenResult = await resolveOrgSyncToken(org.id);
  if ('status' in tokenResult) {
    return tokenResult;
  }

  const began = await beginOrgSyncRun(input, org.id);
  if (!began.ok) {
    return { status: 'skipped', reason: 'concurrent_sync' };
  }

  return executeStartedOrgSync({
    mode: input.mode,
    onProgress: input.onProgress,
    org,
    platform,
    settings,
    syncRunId: began.syncRunId,
    token: tokenResult.token,
  });
}
