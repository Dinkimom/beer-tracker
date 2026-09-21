/**
 * Очередь BullMQ для задач экспортёра (Next.js / cron ставят jobs, воркер — apps/sync-worker).
 */

import type { SyncJobPayload } from './types';

import { type Job, Queue } from 'bullmq';

import { SYNC_QUEUE_NAME } from './constants';
import { acquireSyncRedisConnection, isSyncRedisConfigured } from './redisConnection';
import { enqueueDedupedSyncJob } from './syncQueueEnqueueHelpers';

const defaultJobOptions = {
  attempts: 5,
  backoff: {
    delay: 2000,
    type: 'exponential' as const,
  },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 200 },
};

let queueSingleton: Queue<SyncJobPayload, unknown, string> | null = null;

export function getSyncQueue(): Queue<SyncJobPayload, unknown, string> {
  if (!queueSingleton) {
    queueSingleton = new Queue<SyncJobPayload, unknown, string>(SYNC_QUEUE_NAME, {
      connection: acquireSyncRedisConnection(),
      defaultJobOptions,
    });
  }
  return queueSingleton;
}

function requireSyncRedis(): void {
  if (!isSyncRedisConfigured()) {
    throw new Error('Redis is not configured (REDIS_URL empty)');
  }
}

/**
 * Первичная полная синхронизация: не более одной «живой» задачи на org (по jobId).
 */
export function enqueueInitialFullSync(
  organizationId: string,
  requestedByUserId?: string
): Promise<Job<SyncJobPayload, unknown, string>> {
  requireSyncRedis();
  const queue = getSyncQueue();
  const legacyInitialId = `initial-full:${organizationId}`;
  const jobId = `initial-full-${organizationId}`;
  return enqueueDedupedSyncJob(queue, {
    jobId,
    legacyJobId: legacyInitialId,
    jobName: 'initial_full',
    payload: {
      mode: 'initial_full',
      organizationId,
      requestedByUserId,
    },
  });
}

/**
 * Инкремент: отдельный jobId на запуск (cron может ставить часто).
 */
export function enqueueIncrementalSync(organizationId: string): Promise<Job<SyncJobPayload, unknown, string>> {
  requireSyncRedis();
  const queue = getSyncQueue();
  const jobId = `incremental-${organizationId}-${Date.now()}`;
  return queue.add('incremental', { mode: 'incremental', organizationId }, { jobId });
}

/**
 * Полный перескан по запросу админа.
 */
export function enqueueFullRescan(
  organizationId: string,
  requestedByUserId?: string
): Promise<Job<SyncJobPayload, unknown, string>> {
  requireSyncRedis();
  const queue = getSyncQueue();
  const legacyFullRescanId = `full-rescan:${organizationId}`;
  const jobId = `full-rescan-${organizationId}`;
  return enqueueDedupedSyncJob(queue, {
    jobId,
    legacyJobId: legacyFullRescanId,
    jobName: 'full_rescan',
    payload: {
      mode: 'full_rescan',
      organizationId,
      requestedByUserId,
    },
  });
}
