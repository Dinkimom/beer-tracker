/**
 * Снимок задач BullMQ по organizationId (waiting/active/delayed/paused).
 */

import type { SyncJobPayload } from './types';

import { getSyncQueue } from './queue';
import { isSyncRedisConfigured } from './redisConnection';
import { normalizeRedisJobProgress } from './redisJobProgress';

interface OrgRedisSyncJob {
  id: string;
  mode: SyncJobPayload['mode'];
  name: string;
  /** 0–100, для полосы прогресса */
  progress: number;
  /** Доп. поля из job.updateProgress({ percent, ... }) — доски, страницы и т.д. */
  progressMeta: Record<string, unknown> | null;
  state: string;
  timestamp: number;
}

const LIVE_STATES = ['waiting', 'active', 'delayed', 'paused'] as const;

export async function listRedisSyncJobsForOrganization(
  organizationId: string
): Promise<OrgRedisSyncJob[]> {
  if (!isSyncRedisConfigured()) {
    return [];
  }
  const queue = getSyncQueue();
  const jobs = await queue.getJobs([...LIVE_STATES], 0, 400);
  const out: OrgRedisSyncJob[] = [];
  for (const job of jobs) {
    const data = job.data as SyncJobPayload | undefined;
    if (data?.organizationId !== organizationId) {
      continue;
    }
    const state = await job.getState();
    const { meta, percent } = normalizeRedisJobProgress(job.progress);
    out.push({
      id: String(job.id ?? ''),
      mode: data.mode,
      name: job.name,
      progress: percent,
      progressMeta: meta,
      state,
      timestamp: job.timestamp,
    });
  }
  return out;
}

export function hasPendingHeavySyncInRedis(jobs: OrgRedisSyncJob[]): boolean {
  return jobs.some(
    (j) =>
      (j.mode === 'full_rescan' || j.mode === 'initial_full') &&
      LIVE_STATES.includes(j.state as (typeof LIVE_STATES)[number])
  );
}
