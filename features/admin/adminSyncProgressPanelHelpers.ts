import type { AdminSyncStatusPayload } from '@/features/admin/adminSyncTypes';

export function resolveHeavyDisplayJob(syncView: AdminSyncStatusPayload) {
  const heavyJobs = syncView.redisJobs.filter(
    (j) => j.mode === 'initial_full' || j.mode === 'full_rescan',
  );
  return (
    heavyJobs.find((j) => j.state === 'active') ??
    heavyJobs.find((j) => ['waiting', 'delayed', 'paused'].includes(j.state)) ??
    null
  );
}

export function resolveWaitingJobId(
  syncView: AdminSyncStatusPayload,
  displayJob: ReturnType<typeof resolveHeavyDisplayJob>
): string | null {
  if (
    syncView.redisConfigured &&
    displayJob?.state === 'waiting' &&
    !syncView.runningSyncRun
  ) {
    return displayJob.id;
  }
  return null;
}

export function resolveRunningStats(
  syncView: AdminSyncStatusPayload
): Record<string, unknown> | null {
  const stats = syncView.runningSyncRun?.stats;
  if (stats && typeof stats === 'object' && !Array.isArray(stats)) {
    return stats as Record<string, unknown>;
  }
  return null;
}
