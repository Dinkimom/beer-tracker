/**
 * DTO admin API (каталог команд, sync status, tracker config shape).
 * Канон для lib/api/admin; features реэкспортируют при необходимости.
 */

export interface AdminTeamMember {
  pending_product_invitation: boolean;
  product_planner_is_team_lead: boolean | null;
  product_team_access: boolean;
  product_user_id: string | null;
  product_user_in_org: boolean;
  role_slug: string | null;
  staff_avatar_url: string | null;
  staff_display_name: string;
  staff_email: string | null;
  staff_id: string;
  staff_tracker_user_id: string | null;
}

export interface AdminTeamRow {
  active: boolean;
  id: string;
  slug: string;
  title: string;
  tracker_board_id: string;
  tracker_queue_key: string;
}

export interface AdminTrackerCatalogTeamBinding {
  id: string;
  title: string;
  tracker_board_id: string;
  tracker_queue_key: string;
}

export interface AdminTrackerCatalogPayload {
  boards: { id: number; name: string }[];
  queues: { key: string; name: string }[];
  teams: AdminTrackerCatalogTeamBinding[];
}

export function teamTitleUsingQueue(
  teams: readonly AdminTrackerCatalogTeamBinding[],
  queueKey: string
): string | null {
  const q = queueKey.trim();
  const row = teams.find((t) => String(t.tracker_queue_key).trim() === q);
  return row?.title ?? null;
}

export function teamTitleUsingBoard(
  teams: readonly AdminTrackerCatalogTeamBinding[],
  boardId: number
): string | null {
  const row = teams.find((t) => {
    const n = Number.parseInt(String(t.tracker_board_id), 10);
    return Number.isFinite(n) && n === boardId;
  });
  return row?.title ?? null;
}

/**
 * Ответ GET /api/admin/organizations/:id/sync/status (фрагмент для админки).
 */
export interface AdminSyncStatusPayload {
  cooldown: { fullRescanCooldownMinutes: number };
  lastSyncRun: {
    errorSummary: string | null;
    finishedAt: string | null;
    id: string;
    jobType: string | null;
    startedAt: string;
    stats: Record<string, unknown>;
    status: string;
  } | null;
  organization: {
    id: string;
    initialSyncCompletedAt: string | null;
    name: string;
    syncNextRunAt: string | null;
  };
  platformSyncBounds: {
    cronTickMinutes: number;
    defaultIntervalMinutes: number;
    defaultMaxIssuesPerRun: number;
    defaultOverlapMinutes: number;
    maxIntervalMinutes: number;
    maxMaxIssuesPerRun: number;
    maxOverlapMinutes: number;
    minIntervalMinutes: number;
    minMaxIssuesPerRun: number;
    minOverlapMinutes: number;
  };
  redisConfigured: boolean;
  redisJobs: Array<{
    id: string;
    mode: string;
    name: string;
    progress: number;
    progressMeta: Record<string, unknown> | null;
    state: string;
    timestamp: number;
  }>;
  resolvedSync: {
    enabled: boolean;
    intervalMinutes: number;
    maxIssuesPerRun: number;
    overlapMinutes: number;
    windowUtc?: { end: string; start: string };
  };
  runningSyncRun: {
    id: string;
    jobType: string | null;
    startedAt: string;
    stats: Record<string, unknown>;
  } | null;
  /** true, если в окружении задан непустой SYNC_CRON_SECRET */
  syncCronSecretConfigured: boolean;
  syncSettingsRaw: unknown;
  syncValidation: { code: string; message: string; ok: false } | { ok: true };
}

export function isAdminSyncStatusPayload(x: unknown): x is AdminSyncStatusPayload {
  if (!x || typeof x !== 'object') {
    return false;
  }
  const o = x as Record<string, unknown>;
  const org = o.organization;
  if (!org || typeof org !== 'object') {
    return false;
  }
  const orgObj = org as Record<string, unknown>;
  return (
    typeof orgObj.id === 'string' &&
    typeof orgObj.name === 'string' &&
    typeof o.syncCronSecretConfigured === 'boolean'
  );
}

export type TrackerConfigShape = Record<string, unknown>;
