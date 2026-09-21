import type { SyncJobPayload } from './types';
import type { Job, Queue } from 'bullmq';

const LIVE_JOB_STATES = ['active', 'delayed', 'paused', 'waiting'] as const;

function isLiveSyncJobState(state: string): boolean {
  return LIVE_JOB_STATES.includes(state as (typeof LIVE_JOB_STATES)[number]);
}

async function getLiveSyncJobById(
  queue: Queue<SyncJobPayload, unknown, string>,
  jobId: string
): Promise<Job<SyncJobPayload, unknown, string> | null> {
  const existing = await queue.getJob(jobId);
  if (!existing) {
    return null;
  }
  const state = await existing.getState();
  return isLiveSyncJobState(state) ? existing : null;
}

async function removeStaleJobIfNeeded(
  queue: Queue<SyncJobPayload, unknown, string>,
  jobId: string
): Promise<void> {
  const existing = await queue.getJob(jobId);
  if (!existing) {
    return;
  }
  const state = await existing.getState();
  if (isLiveSyncJobState(state)) {
    return;
  }
  await existing.remove();
}

export async function enqueueDedupedSyncJob(
  queue: Queue<SyncJobPayload, unknown, string>,
  params: {
    jobId: string;
    legacyJobId?: string;
    jobName: string;
    payload: SyncJobPayload;
  }
): Promise<Job<SyncJobPayload, unknown, string>> {
  if (params.legacyJobId) {
    await removeStaleJobIfNeeded(queue, params.legacyJobId);
  }
  await removeStaleJobIfNeeded(queue, params.jobId);
  const legacyLive = params.legacyJobId
    ? await getLiveSyncJobById(queue, params.legacyJobId)
    : null;
  if (legacyLive) {
    return legacyLive;
  }
  const live = await getLiveSyncJobById(queue, params.jobId);
  if (live) {
    return live;
  }
  return queue.add(params.jobName, params.payload, { jobId: params.jobId });
}
