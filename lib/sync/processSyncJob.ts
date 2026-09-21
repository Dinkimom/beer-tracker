/**
 * Обработка одной задачи синхронизации: runOrgSync + прогресс для UI.
 */

import type { SyncJobPayload } from './types';
import type { Job } from 'bullmq';

import { parseSyncJobPayload } from './payload';
import { runOrgSync, type RunOrgSyncResult } from './runOrgSync';

async function updateSyncJobProgress(
  job: Job,
  percent: number,
  meta?: Record<string, unknown>
): Promise<void> {
  if (meta != null && Object.keys(meta).length > 0) {
    await job.updateProgress({ percent, ...meta });
    return;
  }
  await job.updateProgress(percent);
}

function logSkippedSyncJob(
  result: Extract<RunOrgSyncResult, { status: 'skipped' }>,
  organizationId: string,
  jobId: Job['id']
): void {
  const detail = result.message != null ? ` (${result.message})` : '';
  console.warn(
    `[sync-worker] skipped reason=${result.reason} org=${organizationId} bullJobId=${jobId}${detail}`
  );
}

function logCompletedSyncJob(
  result: Extract<RunOrgSyncResult, { status: 'ok' }>,
  organizationId: string,
  jobId: Job['id']
): void {
  console.warn(
    `[sync-worker] done status=${result.finalStatus} org=${organizationId} bullJobId=${jobId} syncRunId=${result.syncRunId}`
  );
}

export async function processSyncJob(job: Job<SyncJobPayload>): Promise<void> {
  const data = parseSyncJobPayload(job.data);
  const result = await runOrgSync({
    bullJobId: String(job.id),
    mode: data.mode,
    onProgress: (percent, meta) => updateSyncJobProgress(job, percent, meta),
    organizationId: data.organizationId,
  });

  if (result.status === 'skipped') {
    if (process.env.NODE_ENV !== 'test') {
      logSkippedSyncJob(result, data.organizationId, job.id);
    }
    await job.updateProgress(100);
    return;
  }

  if (process.env.NODE_ENV !== 'test') {
    logCompletedSyncJob(result, data.organizationId, job.id);
  }
}
