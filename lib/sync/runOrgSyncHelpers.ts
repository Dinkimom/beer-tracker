import type { RunOrgSyncInput, RunOrgSyncResult } from './runOrgSync';
import type { SyncJobMode } from './types';
import type { SyncPlatformEnv } from '@/lib/env';
import type { OrganizationRow } from '@/lib/organizations/types';
import type { ResolvedOrgSyncSettings } from '@/lib/orgSyncSettings';

import { getIssueTrackerProviderKind, getSyncPlatformEnv, getTrackerConfig } from '@/lib/env';
import { readIssueTrackerExternalOrgId } from '@/lib/issueTrackerProvider';
import { createIssueTrackerProviderClientFromResolvedConfig } from '@/lib/issueTrackerProvider/clientFactory';
import {
  JIRA_CLOUD_BASIC_AUTH_EMAIL_REQUIRED_MESSAGE,
  jiraCloudRequiresBasicAuthEmail,
} from '@/lib/issueTrackerProvider/jiraBasicAuthEmail';
import { readIssueTrackerBasicAuthEmail } from '@/lib/issueTrackerProvider/settings';
import {
  mergeIssueTrackerQueueKeys,
  uniqueIssueTrackerQueueKeysFromTeams,
} from '@/lib/issueTrackerProvider/storageAliases';
import {
  issueTrackerStoredProvider,
  type IssueTrackerProviderClient,
  type IssueTrackerProviderKind,
} from '@/lib/issueTrackerProvider/types';
import { yandexIssueFromProviderIssue } from '@/lib/issueTrackerProvider/yandexTrackerProvider';
import {
  findOrganizationById,
  getDecryptedOrganizationTrackerToken,
} from '@/lib/organizations';
import {
  getLastFullRescanAtFromSettingsRoot,
  parseResolveAndValidateOrgSyncFromSettingsRoot,
} from '@/lib/orgSyncSettings';
import { upsertIssueSnapshotsForOrg } from '@/lib/snapshots';
import { listTeams } from '@/lib/staffTeams/teamsRepository';
import { TRACKER_ISSUES_SEARCH_PER_PAGE_CAP } from '@/lib/trackerApi/issuesFetchHelpers';

import { runChangelogSyncWithProgress } from './runChangelogSyncWithProgress';
import { runFullSyncModes } from './runFullSyncModes';
import {
  finishSyncRun,
  getLastIncrementalWatermarkUntil,
  type SyncRunTerminalStatus,
} from './syncRunsRepository';
import {
  computeIncrementalWindow,
  WATERMARK_UNTIL_STATS_KEY,
} from './watermark';

interface OrgSyncRunContext {
  org: OrganizationRow;
  platform: SyncPlatformEnv;
  settings: ResolvedOrgSyncSettings;
}

function skipIncrementalOrgSync(
  input: RunOrgSyncInput,
  org: OrganizationRow,
  settings: ResolvedOrgSyncSettings
): RunOrgSyncResult | null {
  if (input.mode === 'incremental' && !settings.enabled) {
    return { status: 'skipped', reason: 'sync_disabled' };
  }
  if (input.mode === 'incremental' && !org.initial_sync_completed_at) {
    return { status: 'skipped', reason: 'incremental_before_initial' };
  }
  const providerKind = getIssueTrackerProviderKind();
  if (providerKind === 'tracker' && !readIssueTrackerExternalOrgId(org)) {
    return { status: 'skipped', reason: 'missing_tracker_org_id' };
  }
  return null;
}

export async function loadOrgSyncRunContext(
  input: RunOrgSyncInput
): Promise<OrgSyncRunContext | RunOrgSyncResult> {
  const org = await findOrganizationById(input.organizationId);
  if (!org) {
    throw new Error(`Organization not found: ${input.organizationId}`);
  }

  const platform = getSyncPlatformEnv();
  const validated = parseResolveAndValidateOrgSyncFromSettingsRoot(org.settings, platform);
  if (!validated.ok) {
    return {
      status: 'skipped',
      reason: 'invalid_sync_settings',
      message: validated.message,
    };
  }

  const skipped = skipIncrementalOrgSync(input, org, validated.settings);
  if (skipped) {
    return skipped;
  }

  return { org, platform, settings: validated.settings };
}

export async function resolveOrgSyncToken(orgId: string): Promise<RunOrgSyncResult | { token: string }> {
  try {
    const t = await getDecryptedOrganizationTrackerToken(orgId);
    if (!t?.trim()) {
      return { status: 'skipped', reason: 'missing_tracker_token' };
    }
    return { token: t.trim() };
  } catch (e) {
    return {
      status: 'skipped',
      reason: 'missing_tracker_token',
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

function createOrgIssueTrackerClient(
  org: OrganizationRow,
  token: string
): { issueTracker: IssueTrackerProviderClient; providerKind: IssueTrackerProviderKind } {
  const providerKind = getIssueTrackerProviderKind();
  const jiraEmail = readIssueTrackerBasicAuthEmail(org.settings);
  if (jiraCloudRequiresBasicAuthEmail(providerKind) && !jiraEmail) {
    throw new Error(JIRA_CLOUD_BASIC_AUTH_EMAIL_REQUIRED_MESSAGE);
  }
  const issueTracker = createIssueTrackerProviderClientFromResolvedConfig({
    apiUrl: getTrackerConfig().apiUrl || '',
    jiraEmail,
    oauthToken: token,
    orgId: readIssueTrackerExternalOrgId(org),
    providerKind,
  });
  return { issueTracker, providerKind };
}

async function executeIncrementalOrgSync(input: {
  issueTracker: IssueTrackerProviderClient;
  mode: SyncJobMode;
  onProgress?: RunOrgSyncInput['onProgress'];
  org: OrganizationRow;
  providerKind: IssueTrackerProviderKind;
  settings: ResolvedOrgSyncSettings;
  syncRunId: string;
}): Promise<{ finalStatus: SyncRunTerminalStatus; syncRunId: string }> {
  const rescanCutoff = getLastFullRescanAtFromSettingsRoot(input.org.settings);
  const lastWm = await getLastIncrementalWatermarkUntil(input.org.id, rescanCutoff);
  const { since, until } = computeIncrementalWindow({
    now: new Date(),
    intervalMinutes: input.settings.intervalMinutes,
    lastWatermarkUntil: lastWm,
    overlapMinutes: input.settings.overlapMinutes,
  });

  await input.onProgress?.(25);

  const queueKeys = mergeIssueTrackerQueueKeys(
    uniqueIssueTrackerQueueKeysFromTeams(await listTeams(input.org.id, { activeOnly: true })),
    input.settings.extraQueueKeys
  );
  const perPage = Math.min(input.settings.maxIssuesPerRun, TRACKER_ISSUES_SEARCH_PER_PAGE_CAP);
  const { issues, truncated } = await input.issueTracker.listIssuesUpdatedInRange(since, until, {
    maxIssues: input.settings.maxIssuesPerRun,
    perPage,
    queueKeys,
  });

  await input.onProgress?.(70);
  const upserted = await upsertIssueSnapshotsForOrg(
    input.org.id,
    issues.map(yandexIssueFromProviderIssue),
    { provider: issueTrackerStoredProvider(input.providerKind) }
  );
  const issueKeys = issues
    .map((i) => i.key)
    .filter((k): k is string => typeof k === 'string' && k.length > 0);
  const changelogUpserted = await runChangelogSyncWithProgress({
    firstProgressExtra: { issues_upserted: upserted },
    issueKeys,
    issueTracker: input.issueTracker,
    onProgress: input.onProgress,
    organizationId: input.org.id,
    percentFrom: 72,
    percentTo: 92,
    syncRunId: input.syncRunId,
  });
  await input.onProgress?.(95);

  const finalStatus: SyncRunTerminalStatus = truncated ? 'partial' : 'success';
  await finishSyncRun({
    extraStats: {
      [WATERMARK_UNTIL_STATS_KEY]: until.toISOString(),
      changelog_rows_upserted: changelogUpserted,
      issues_fetched: issues.length,
      issues_upserted: upserted,
      mode: input.mode,
      requested_since: since.toISOString(),
      requested_until: until.toISOString(),
      truncated,
      queues_total: queueKeys.length,
    },
    status: finalStatus,
    syncRunId: input.syncRunId,
  });
  await input.onProgress?.(100);
  return { finalStatus, syncRunId: input.syncRunId };
}

export async function executeStartedOrgSync(input: {
  mode: RunOrgSyncInput['mode'];
  onProgress?: RunOrgSyncInput['onProgress'];
  org: OrganizationRow;
  platform: SyncPlatformEnv;
  settings: ResolvedOrgSyncSettings;
  syncRunId: string;
  token: string;
}): Promise<RunOrgSyncResult> {
  try {
    await input.onProgress?.(10);
    const { issueTracker, providerKind } = createOrgIssueTrackerClient(input.org, input.token);

    if (input.mode === 'incremental') {
      const incremental = await executeIncrementalOrgSync({
        issueTracker,
        mode: input.mode,
        onProgress: input.onProgress,
        org: input.org,
        providerKind,
        settings: input.settings,
        syncRunId: input.syncRunId,
      });
      return { status: 'ok', syncRunId: incremental.syncRunId, finalStatus: incremental.finalStatus };
    }

    const { finalStatus } = await runFullSyncModes({
      issueTracker,
      mode: input.mode,
      onProgress: input.onProgress,
      org: input.org,
      platform: input.platform,
      providerKind,
      settings: input.settings,
      syncRunId: input.syncRunId,
    });
    return { status: 'ok', finalStatus, syncRunId: input.syncRunId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finishSyncRun({
      errorSummary: msg,
      extraStats: { error: msg },
      status: 'failed',
      syncRunId: input.syncRunId,
    });
    throw e;
  }
}
