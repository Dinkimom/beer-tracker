/**
 * BullMQ Worker: обрабатывает задачи очереди в отдельном процессе (pnpm sync-worker).
 */

import type { SyncJobPayload } from './types';

import { type Job, Worker } from 'bullmq';

import { SYNC_QUEUE_NAME } from './constants';
import { processSyncJob } from './processSyncJob';
import { acquireSyncRedisConnection } from './redisConnection';

export function createSyncWorker(): Worker<SyncJobPayload, unknown, string> {
  const connection = acquireSyncRedisConnection();
  return new Worker<SyncJobPayload, unknown, string>(
    SYNC_QUEUE_NAME,
    async (job: Job<SyncJobPayload, unknown, string>) => {
      await processSyncJob(job);
    },
    {
      concurrency: 2,
      connection,
    }
  );
}
