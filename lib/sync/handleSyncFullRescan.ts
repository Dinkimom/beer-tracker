/**
 * Логика POST /api/internal/sync/full-rescan: секрет + cooldown → inline full_rescan без Redis/BullMQ.
 */

import { getSyncPlatformEnv, verifySyncCronSecret } from '@/lib/env';
import { findOrganizationById } from '@/lib/organizations';

import { fullRescanCooldownRemainingMs } from './fullRescanCooldown';
import { runOrgSync, type RunOrgSyncResult } from './runOrgSync';
import {
  findLastFullRescanFinishedAt,
  findRunningSyncRunForOrganization,
  finishSyncRun,
} from './syncRunsRepository';

/** Больше maxDuration маршрута (30 мин): running после таймаута Cloud Run / деплоя считаем зависшим. */
const STALE_INLINE_SYNC_RUN_MS = 40 * 60_000;

const STALE_INLINE_SYNC_RUN_MESSAGE = 'Прервано: превышено время inline-прогона';

interface SyncFullRescanSuccessBody {
  finalStatus: string;
  organizationId: string;
  syncRunId: string;
}

type HandleSyncFullRescanResponse =
  | { body: SyncFullRescanSuccessBody; ok: true }
  | { error: string; ok: false; retryAfterSeconds?: number; status: number; syncRunId?: string };

function skippedReasonToHttp(result: Extract<RunOrgSyncResult, { status: 'skipped' }>): {
  error: string;
  status: number;
} {
  if (result.reason === 'concurrent_sync') {
    return { error: 'Уже выполняется синхронизация', status: 409 };
  }
  const detail = result.message != null && result.message.length > 0 ? `: ${result.message}` : '';
  return {
    error: `Синхронизация пропущена (${result.reason})${detail}`,
    status: 422,
  };
}

function isStaleInlineSyncRun(startedAt: Date, nowMs: number): boolean {
  const startedMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startedMs)) {
    return true;
  }
  return nowMs - startedMs > STALE_INLINE_SYNC_RUN_MS;
}

async function assertCanRunFullRescan(
  organizationId: string
): Promise<Extract<HandleSyncFullRescanResponse, { ok: false }> | null> {
  const running = await findRunningSyncRunForOrganization(organizationId);
  if (running) {
    if (isStaleInlineSyncRun(running.started_at, Date.now())) {
      await finishSyncRun({
        errorSummary: STALE_INLINE_SYNC_RUN_MESSAGE,
        status: 'failed',
        syncRunId: running.id,
      });
    } else {
      return {
        error: 'Уже выполняется синхронизация',
        ok: false,
        status: 409,
        syncRunId: running.id,
      };
    }
  }

  const platform = getSyncPlatformEnv();
  const lastFull = await findLastFullRescanFinishedAt(organizationId);
  const remainMs = fullRescanCooldownRemainingMs({
    cooldownMinutes: platform.fullRescanCooldownMinutes,
    lastFullRescanFinishedAt: lastFull,
    now: new Date(),
  });
  if (remainMs > 0) {
    return {
      error: 'Слишком рано для нового полного rescan (cooldown)',
      ok: false,
      retryAfterSeconds: Math.ceil(remainMs / 1000),
      status: 429,
    };
  }

  return null;
}

export async function handleSyncFullRescan(params: {
  cronSecret: string;
  organizationId: string;
}): Promise<HandleSyncFullRescanResponse> {
  if (!verifySyncCronSecret(params.cronSecret)) {
    return { error: 'Unauthorized', ok: false, status: 401 };
  }

  const org = await findOrganizationById(params.organizationId);
  if (!org) {
    return { error: 'Организация не найдена', ok: false, status: 404 };
  }

  const denied = await assertCanRunFullRescan(org.id);
  if (denied) {
    return denied;
  }

  const result = await runOrgSync({
    mode: 'full_rescan',
    organizationId: org.id,
  });

  if (result.status === 'skipped') {
    const mapped = skippedReasonToHttp(result);
    return { error: mapped.error, ok: false, status: mapped.status };
  }

  return {
    body: {
      finalStatus: result.finalStatus,
      organizationId: org.id,
      syncRunId: result.syncRunId,
    },
    ok: true,
  };
}
