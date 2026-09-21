/**
 * Логика POST /api/internal/sync/tick: секрет, выбор org, постановка incremental в BullMQ, сдвиг sync_next_run_at.
 */

import { getSyncPlatformEnv, verifySyncCronSecret } from '@/lib/env';
import { listOrganizationsDueForIncrementalSync } from '@/lib/organizations';

import {
  buildSyncTickResultBody,
  collectDueOrganizationIncrementalSyncs,
} from './handleSyncTickHelpers';
import { isSyncRedisConfigured } from './redisConnection';

export interface SyncTickResultBody {
  enqueued: number;
  organizationIds: string[];
  reason?: 'redis_not_configured';
  skippedInvalidSettings?: number;
}

type HandleSyncTickResponse =
  | { body: SyncTickResultBody; ok: true }
  | { ok: false; status: 401 };

export async function handleSyncTick(params: {
  cronSecret: string;
}): Promise<HandleSyncTickResponse> {
  if (!verifySyncCronSecret(params.cronSecret)) {
    return { ok: false, status: 401 };
  }

  if (!isSyncRedisConfigured()) {
    return {
      body: {
        enqueued: 0,
        organizationIds: [],
        reason: 'redis_not_configured',
      },
      ok: true,
    };
  }

  const platform = getSyncPlatformEnv();
  const candidates = await listOrganizationsDueForIncrementalSync(platform.maxOrgsPerTick);

  const { organizationIds, skippedInvalidSettings } = await collectDueOrganizationIncrementalSyncs(
    candidates,
    platform
  );

  return {
    body: buildSyncTickResultBody(organizationIds, skippedInvalidSettings),
    ok: true,
  };
}
