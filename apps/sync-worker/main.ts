/**
 * Отдельный процесс BullMQ (не Next.js).
 *
 * Локально: `REDIS_URL=redis://localhost:6379 pnpm sync-worker`
 * Образ: Docker target `sync-worker` → `node index.js`
 */

import { createSyncWorker, quitSyncRedisBase } from '@/lib/sync';

function main(): void {
  const worker = createSyncWorker();

  worker.on('failed', (job, err) => {
    console.error('[sync-worker] job failed', job?.id, err);
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

try {
  main();
} catch (err) {
  console.error('[sync-worker] fatal', err);
  process.exit(1);
}
