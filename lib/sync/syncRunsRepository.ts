/**
 * sync_runs: блокировка одного running на org и финализация прогона.
 */

import type { SyncJobMode } from './types';
import type { QueryParams } from '@/types';

import { DatabaseError } from 'pg';

import { query } from '@/lib/db';

import { WATERMARK_UNTIL_STATS_KEY } from './watermark';

export type SyncRunTerminalStatus = 'failed' | 'partial' | 'success';

export const INTERRUPTED_SYNC_RUN_MESSAGE =
  'Прогон прерван перезапуском воркера синхронизации.';

function isPostgresUniqueViolation(err: unknown): boolean {
  return err instanceof DatabaseError && err.code === '23505';
}

export async function tryBeginSyncRun(params: {
  initialStats: Record<string, unknown>;
  jobType: SyncJobMode;
  organizationId: string;
}): Promise<{ ok: false; reason: 'concurrent_sync' } | { ok: true; syncRunId: string }> {
  try {
    const res = await query<{ id: string }>(
      `INSERT INTO sync_runs (organization_id, job_type, status, stats)
       VALUES ($1, $2, 'running', $3::jsonb)
       RETURNING id`,
      [params.organizationId, params.jobType, JSON.stringify(params.initialStats)] as QueryParams
    );
    const id = res.rows[0]?.id;
    if (!id) {
      throw new Error('tryBeginSyncRun: no id returned');
    }
    return { ok: true, syncRunId: id };
  } catch (err) {
    if (isPostgresUniqueViolation(err)) {
      return { ok: false, reason: 'concurrent_sync' };
    }
    throw err;
  }
}

/** Чекпоинт прогона: merge в stats пока status = running (для UI / отладки). */
export async function mergeSyncRunStats(
  syncRunId: string,
  patch: Record<string, unknown>
): Promise<void> {
  await query(
    `UPDATE sync_runs
     SET stats = COALESCE(stats, '{}'::jsonb) || $2::jsonb
     WHERE id = $1 AND status = 'running'`,
    [syncRunId, JSON.stringify(patch)] as QueryParams
  );
}

export async function finishSyncRun(params: {
  errorSummary?: string | null;
  extraStats?: Record<string, unknown>;
  status: SyncRunTerminalStatus;
  syncRunId: string;
}): Promise<void> {
  const extraJson =
    params.extraStats != null && Object.keys(params.extraStats).length > 0
      ? JSON.stringify(params.extraStats)
      : '{}';
  await query(
    `UPDATE sync_runs
     SET finished_at = CURRENT_TIMESTAMP,
         status = $2,
         stats = COALESCE(stats, '{}'::jsonb) || $3::jsonb,
         error_summary = COALESCE($4, error_summary)
     WHERE id = $1`,
    [params.syncRunId, params.status, extraJson, params.errorSummary ?? null] as QueryParams
  );
}

/**
 * Последний watermark из успешных/частичных инкрементальных прогонов (по finished_at).
 */
export async function getLastIncrementalWatermarkUntil(
  organizationId: string,
  ignoreIncrementalFinishedBefore?: Date | null
): Promise<Date | null> {
  const res = await query<{ w: string | null }>(
    `SELECT stats->>$2 AS w
     FROM sync_runs
     WHERE organization_id = $1
       AND job_type = 'incremental'
       AND status IN ('success', 'partial')
       AND finished_at IS NOT NULL
       AND stats ? $2
       AND ($3::timestamptz IS NULL OR finished_at > $3)
     ORDER BY finished_at DESC
     LIMIT 1`,
    [
      organizationId,
      WATERMARK_UNTIL_STATS_KEY,
      ignoreIncrementalFinishedBefore ?? null,
    ]
  );
  const raw = res.rows[0]?.w;
  if (raw == null || raw === '') {
    return null;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Строка sync_runs для админки / статуса. */
interface SyncRunEntity {
  error_summary: string | null;
  finished_at: Date | null;
  id: string;
  job_type: string | null;
  organization_id: string;
  started_at: Date;
  stats: unknown;
  status: string;
}

export async function failInterruptedRunningSyncRuns(): Promise<number> {
  const res = await query(
    `UPDATE sync_runs
     SET finished_at = CURRENT_TIMESTAMP,
         status = 'failed',
         error_summary = $1
     WHERE status = 'running'`,
    [INTERRUPTED_SYNC_RUN_MESSAGE]
  );
  return res.rowCount ?? 0;
}

/** Повтор той же BullMQ-задачи после убитого процесса: закрыть её зависший running. */
export async function failRunningSyncRunForBullJob(
  organizationId: string,
  bullJobId: string
): Promise<boolean> {
  const res = await query(
    `UPDATE sync_runs
     SET finished_at = CURRENT_TIMESTAMP,
         status = 'failed',
         error_summary = $3
     WHERE organization_id = $1
       AND status = 'running'
       AND stats->>'bull_job_id' = $2`,
    [organizationId, bullJobId, INTERRUPTED_SYNC_RUN_MESSAGE] as QueryParams
  );
  return (res.rowCount ?? 0) > 0;
}

export async function findRunningSyncRunForOrganization(
  organizationId: string
): Promise<SyncRunEntity | null> {
  const res = await query<SyncRunEntity>(
    `SELECT id, organization_id, job_type, started_at, finished_at, status, stats, error_summary
     FROM sync_runs
     WHERE organization_id = $1 AND status = 'running'
     LIMIT 1`,
    [organizationId]
  );
  return res.rows[0] ?? null;
}

export async function findLatestSyncRunForOrganization(
  organizationId: string
): Promise<SyncRunEntity | null> {
  const res = await query<SyncRunEntity>(
    `SELECT id, organization_id, job_type, started_at, finished_at, status, stats, error_summary
     FROM sync_runs
     WHERE organization_id = $1
     ORDER BY started_at DESC
     LIMIT 1`,
    [organizationId]
  );
  return res.rows[0] ?? null;
}

export async function findLastFullRescanFinishedAt(
  organizationId: string
): Promise<Date | null> {
  const res = await query<{ finished_at: Date | null }>(
    `SELECT finished_at
     FROM sync_runs
     WHERE organization_id = $1
       AND job_type = 'full_rescan'
       AND status IN ('success', 'partial')
       AND finished_at IS NOT NULL
     ORDER BY finished_at DESC
     LIMIT 1`,
    [organizationId]
  );
  const t = res.rows[0]?.finished_at;
  return t ?? null;
}
