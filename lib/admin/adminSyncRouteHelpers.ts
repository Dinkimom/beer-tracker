import { NextResponse } from 'next/server';

import { fullRescanCooldownRemainingMs } from '@/lib/sync/fullRescanCooldown';
import {
  hasPendingHeavySyncInRedis,
  listRedisSyncJobsForOrganization,
} from '@/lib/sync/listRedisSyncJobsForOrganization';
import { isSyncRedisConfigured } from '@/lib/sync/redisConnection';
import { findRunningSyncRunForOrganization } from '@/lib/sync/syncRunsRepository';

export function assertSyncRedisReady(): NextResponse | null {
  if (!isSyncRedisConfigured()) {
    return NextResponse.json({ error: 'Redis не настроен (REDIS_URL)' }, { status: 503 });
  }
  return null;
}

export function fullRescanCooldownResponse(remainMs: number): NextResponse {
  const retryAfterSeconds = Math.ceil(remainMs / 1000);
  return NextResponse.json(
    {
      error: 'Слишком рано для нового полного rescan (cooldown)',
      retryAfterSeconds,
    },
    { status: 429 }
  );
}

export function fullRescanCooldownRemaining(params: {
  cooldownMinutes: number;
  lastFullRescanFinishedAt: Date | null;
}): number {
  return fullRescanCooldownRemainingMs({
    cooldownMinutes: params.cooldownMinutes,
    lastFullRescanFinishedAt: params.lastFullRescanFinishedAt,
    now: new Date(),
  });
}

export async function assertNoRunningOrQueuedHeavySync(
  orgId: string,
  queuedError: string
): Promise<NextResponse | null> {
  const running = await findRunningSyncRunForOrganization(orgId);
  if (running) {
    return NextResponse.json(
      { error: 'Уже выполняется синхронизация', syncRunId: running.id },
      { status: 409 }
    );
  }
  const redisJobs = await listRedisSyncJobsForOrganization(orgId);
  if (hasPendingHeavySyncInRedis(redisJobs)) {
    return NextResponse.json({ error: queuedError }, { status: 409 });
  }
  return null;
}
