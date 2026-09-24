/**
 * Отдельный процесс BullMQ (не Next.js).
 *
 * Локально: `REDIS_URL=redis://localhost:6379 pnpm sync-worker`
 * Образ: Docker target `sync-worker` → `node index.js`
 */

import { createSyncWorker, quitSyncRedisBase } from '@/lib/sync';
import { failInterruptedRunningSyncRuns } from '@/lib/sync/syncRunsRepository';

function syncJobFailureLog(err: unknown): unknown {
  if (!err || typeof err !== 'object' || !('response' in err)) {
    return err instanceof Error ? err.message : err;
  }
  const response = (err as { response?: { data?: unknown; status?: number } }).response;
  return {
    data: response?.data,
    message: err instanceof Error ? err.message : String(err),
    status: response?.status,
  };
}

async function main(): Promise<void> {
  const interrupted = await failInterruptedRunningSyncRuns();
  if (interrupted > 0) {
    console.warn(`[sync-worker] closed ${interrupted} sync run(s) left running by a restart`);
  }
  const worker = createSyncWorker();

  worker.on('failed', (job, err) => {
    console.error('[sync-worker] job failed', job?.id, syncJobFailureLog(err));
  });

  const shutdown = async () => {
    await worker.close();
    await quitSyncRedisBase();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}

main().catch((err: unknown) => {
  console.error('[sync-worker] fatal', err);
  process.exit(1);
});
