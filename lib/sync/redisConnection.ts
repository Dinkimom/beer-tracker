/**
 * Подключение к Redis для BullMQ (отдельный duplicate на клиент очереди / воркер).
 */

import { Redis } from 'ioredis';

import { getRedisUrl } from '@/lib/env';

let sharedBase: Redis | null = null;

export function isSyncRedisConfigured(): boolean {
  return Boolean(getRedisUrl());
}

export function acquireSyncRedisConnection(): Redis {
  const url = getRedisUrl();
  if (!url) {
    throw new Error('REDIS_URL is not set; BullMQ sync queue is unavailable');
  }
  if (!sharedBase) {
    sharedBase = new Redis(url, { maxRetriesPerRequest: null });
  }
  return sharedBase.duplicate();
}

export async function quitSyncRedisBase(): Promise<void> {
  if (sharedBase) {
    await sharedBase.quit();
    sharedBase = null;
  }
}
