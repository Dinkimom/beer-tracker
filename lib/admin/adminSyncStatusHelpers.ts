
import { getSyncCronSecret } from '@/lib/env';
import {
  extractOrgSyncSettingsJson,
  OrgSyncSettingsPartialSchema,
  resolveOrgSyncSettings,
  validateResolvedOrgSyncSettings,
} from '@/lib/orgSyncSettings';
import { isSyncRedisConfigured } from '@/lib/sync/redisConnection';

function mapSyncRunSummary(run: {
  error_summary: string | null;
  finished_at: Date | null;
  id: string;
  job_type: string | null;
  started_at: Date;
  stats: unknown;
  status: string;
} | null) {
  if (!run) return null;
  return {
    errorSummary: run.error_summary,
    finishedAt: run.finished_at,
    id: run.id,
    jobType: run.job_type,
    startedAt: run.started_at,
    stats: run.stats,
    status: run.status,
  };
}

function mapRunningSyncRun(run: {
  id: string;
  job_type: string | null;
  started_at: Date;
  stats: unknown;
} | null) {
  if (!run) return null;
  return { id: run.id, jobType: run.job_type, startedAt: run.started_at, stats: run.stats };
}

export function buildSyncStatusPayload(params: {
  latest: Parameters<typeof mapSyncRunSummary>[0];
  org: {
    id: string;
    initial_sync_completed_at: Date | null;
    name: string;
    settings: unknown;
    sync_next_run_at: Date | null;
  };
  platform: Parameters<typeof resolveOrgSyncSettings>[1];
  redisJobs: unknown;
  running: Parameters<typeof mapRunningSyncRun>[0];
}) {
  const rawSync = extractOrgSyncSettingsJson(params.org.settings);
  const parsedSync = OrgSyncSettingsPartialSchema.safeParse(rawSync);
  const syncPartial = parsedSync.success ? parsedSync.data : {};
  const resolvedSync = resolveOrgSyncSettings(syncPartial, params.platform);
  const syncValidation = validateResolvedOrgSyncSettings(resolvedSync, params.platform);

  return {
    cooldown: { fullRescanCooldownMinutes: params.platform.fullRescanCooldownMinutes },
    lastSyncRun: mapSyncRunSummary(params.latest),
    organization: {
      id: params.org.id,
      initialSyncCompletedAt: params.org.initial_sync_completed_at,
      name: params.org.name,
      syncNextRunAt: params.org.sync_next_run_at,
    },
    platformSyncBounds: {
      cronTickMinutes: params.platform.cronTickMinutes,
      defaultIntervalMinutes: params.platform.defaultIntervalMinutes,
      defaultMaxIssuesPerRun: params.platform.defaultMaxIssuesPerRun,
      defaultOverlapMinutes: params.platform.defaultOverlapMinutes,
      maxIntervalMinutes: params.platform.maxIntervalMinutes,
      maxMaxIssuesPerRun: params.platform.maxMaxIssuesPerRun,
      maxOverlapMinutes: params.platform.maxOverlapMinutes,
      minIntervalMinutes: params.platform.minIntervalMinutes,
      minMaxIssuesPerRun: params.platform.minMaxIssuesPerRun,
      minOverlapMinutes: params.platform.minOverlapMinutes,
    },
    redisConfigured: isSyncRedisConfigured(),
    redisJobs: params.redisJobs,
    resolvedSync,
    runningSyncRun: mapRunningSyncRun(params.running),
    syncCronSecretConfigured: getSyncCronSecret().length > 0,
    syncSettingsRaw: extractOrgSyncSettingsJson(params.org.settings),
    syncValidation: syncValidation.ok
      ? { ok: true as const }
      : { code: syncValidation.code, message: syncValidation.message, ok: false as const },
  };
}
