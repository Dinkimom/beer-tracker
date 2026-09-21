/**
 * Human-readable progress lines for the admin UI (Redis job meta / sync_runs.stats).
 */

import { describeFullSyncCheckpoint } from './syncProgressForAdminCheckpointHelpers';
import { buildSyncProgressPhaseHandlers } from './syncProgressForAdminPhaseMap';

type SyncProgressTranslate = (
  key: string,
  params?: Record<string, number | string>,
) => string;

function describeChangelogFetchProgress(
  input: {
    batchIndex?: number;
    batchTotal?: number;
    keysDone: number;
    keysTotal: number;
  },
  t: SyncProgressTranslate,
): string {
  const { batchIndex, batchTotal, keysDone, keysTotal } = input;
  if (keysTotal === 0) {
    return t("admin.syncProgress.changelog.noTasks");
  }
  if (keysDone === 0) {
    return t("admin.syncProgress.changelog.requesting", { count: keysTotal });
  }
  const batchPart =
    batchIndex != null &&
    batchTotal != null &&
    batchIndex > 0 &&
    batchTotal > 0
      ? t("admin.syncProgress.changelog.batch", {
          current: batchIndex,
          total: batchTotal,
        })
      : "";
  return t("admin.syncProgress.changelog.progress", {
    done: keysDone,
    total: keysTotal,
    batch: batchPart,
  });
}

function changelogProgressLineFromJobMeta(
  meta: Record<string, unknown>,
  t: SyncProgressTranslate,
): string | null {
  const kd = meta.changelogKeysDone;
  const kt = meta.changelogKeysTotal;
  if (typeof kd !== "number" || typeof kt !== "number") {
    return null;
  }
  return describeChangelogFetchProgress(
    {
      batchIndex:
        typeof meta.changelogBatchIndex === "number"
          ? meta.changelogBatchIndex
          : undefined,
      batchTotal:
        typeof meta.changelogBatchTotal === "number"
          ? meta.changelogBatchTotal
          : undefined,
      keysDone: kd,
      keysTotal: kt,
    },
    t,
  );
}

function changelogProgressLineFromStats(
  stats: Record<string, unknown>,
  t: SyncProgressTranslate,
): string | null {
  const cf = stats.changelog_fetch;
  if (cf == null || typeof cf !== "object" || Array.isArray(cf)) {
    return null;
  }
  const c = cf as Record<string, unknown>;
  const keysDone = Number(c.keys_done);
  const keysTotal = Number(c.keys_total);
  if (!Number.isFinite(keysDone) || !Number.isFinite(keysTotal)) {
    return null;
  }
  const bi = Number(c.batch_index);
  const bt = Number(c.batch_total);
  return describeChangelogFetchProgress(
    {
      batchIndex: Number.isFinite(bi) ? bi : undefined,
      batchTotal: Number.isFinite(bt) ? bt : undefined,
      keysDone,
      keysTotal,
    },
    t,
  );
}

export function redisJobStateLabel(
  state: string,
  t: SyncProgressTranslate,
  has: (key: string) => boolean,
): string {
  const key = `admin.syncProgress.redisJob.${state}`;
  return has(key) ? t(key) : state;
}

export function describeSyncProgressMeta(
  meta: Record<string, unknown> | null | undefined,
  t: SyncProgressTranslate,
): string | null {
  if (meta == null || typeof meta.phase !== 'string') {
    return null;
  }
  const handlers = buildSyncProgressPhaseHandlers(changelogProgressLineFromJobMeta);
  return handlers[meta.phase]?.(meta, t) ?? null;
}

export function describeStatsCheckpoint(
  stats: Record<string, unknown> | null | undefined,
  t: SyncProgressTranslate,
): string | null {
  if (stats == null) {
    return null;
  }
  if (stats.phase === 'changelog_fetch') {
    const line = changelogProgressLineFromStats(stats, t);
    if (line != null) {
      return line;
    }
  }
  return describeFullSyncCheckpoint(stats, t);
}
