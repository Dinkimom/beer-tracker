/**
 * Настройки инкрементальной синхронизации организации: organizations.settings.sync
 * и проверка относительно глобальных границ из env (design: overlap > период cron-тика).
 */

import type { SyncPlatformEnv } from './env';

import { z } from 'zod';

import { normalizeIssueTrackerQueueKeys } from '@/lib/issueTrackerProvider/storageAliases';

const OptionalWindowUtcSchema = z
  .object({
    start: z.string().min(1),
    end: z.string().min(1),
  })
  .optional();

/** Фрагмент JSON из organizations.settings.sync (все поля опциональны при парсе). */
export const OrgSyncSettingsPartialSchema = z
  .object({
    enabled: z.boolean().optional(),
    intervalMinutes: z.number().int().positive().optional(),
    overlapMinutes: z.number().int().nonnegative().optional(),
    maxIssuesPerRun: z.number().int().positive().optional(),
    /** ISO-время; выставляется full_rescan, не участвует в resolve интервала. */
    lastFullRescanAt: z.string().optional(),
    /** Очереди и проекты сверх тех, что заданы у команд. */
    extraQueueKeys: z.array(z.string().trim().min(1).max(256)).max(50).optional(),
    windowUtc: OptionalWindowUtcSchema,
  })
  .strict();

export type OrgSyncSettingsPartial = z.infer<typeof OrgSyncSettingsPartialSchema>;

export interface ResolvedOrgSyncSettings {
  enabled: boolean;
  extraQueueKeys: string[];
  intervalMinutes: number;
  maxIssuesPerRun: number;
  overlapMinutes: number;
  windowUtc?: { start: string; end: string };
}

export function parseOrgSyncSettingsPartial(raw: unknown): OrgSyncSettingsPartial {
  const result = OrgSyncSettingsPartialSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid organization sync settings: ${result.error.issues.map((i) => i.message).join('; ')}`
    );
  }
  return result.data;
}

/**
 * ISO-время завершения последнего успешного full_rescan (сброс базы для инкрементального watermark).
 * Хранится в organizations.settings.sync.lastFullRescanAt (вне Zod partial — произвольное поле JSON).
 */
export function getLastFullRescanAtFromSettingsRoot(settingsRoot: unknown): Date | null {
  const sync = extractOrgSyncSettingsJson(settingsRoot);
  if (sync === null || typeof sync !== 'object' || Array.isArray(sync)) {
    return null;
  }
  const raw = (sync as Record<string, unknown>).lastFullRescanAt;
  if (typeof raw !== 'string' || !raw.trim()) {
    return null;
  }
  const d = new Date(raw.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Достаёт объект sync из корня settings (JSONB). */
export function extractOrgSyncSettingsJson(settingsRoot: unknown): unknown {
  if (settingsRoot === null || settingsRoot === undefined) {
    return {};
  }
  if (typeof settingsRoot !== 'object') {
    return {};
  }
  const sync = (settingsRoot as Record<string, unknown>).sync;
  if (sync === null || sync === undefined) {
    return {};
  }
  if (typeof sync !== 'object' || Array.isArray(sync)) {
    return {};
  }
  return sync;
}

function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Сливает частичные настройки org с платформенными дефолтами и ограничивает min/max.
 * Не проверяет правило overlap > cron — для этого {@link validateResolvedOrgSyncSettings}.
 */
export function resolveOrgSyncSettings(
  partial: OrgSyncSettingsPartial,
  platform: SyncPlatformEnv
): ResolvedOrgSyncSettings {
  const intervalMinutes = clampInt(
    partial.intervalMinutes ?? platform.defaultIntervalMinutes,
    platform.minIntervalMinutes,
    platform.maxIntervalMinutes
  );
  const overlapMinutes = clampInt(
    partial.overlapMinutes ?? platform.defaultOverlapMinutes,
    platform.minOverlapMinutes,
    platform.maxOverlapMinutes
  );
  const maxIssuesPerRun = clampInt(
    partial.maxIssuesPerRun ?? platform.defaultMaxIssuesPerRun,
    platform.minMaxIssuesPerRun,
    platform.maxMaxIssuesPerRun
  );
  return {
    enabled: partial.enabled ?? true,
    extraQueueKeys: normalizeIssueTrackerQueueKeys(partial.extraQueueKeys),
    intervalMinutes,
    overlapMinutes,
    maxIssuesPerRun,
    windowUtc: partial.windowUtc,
  };
}

export type OrgSyncValidationErrorCode = 'OVERLAP_NOT_GREATER_THAN_CRON_TICK';

export type OrgSyncValidationResult =
  | { code: OrgSyncValidationErrorCode; message: string; ok: false }
  | { ok: true; settings: ResolvedOrgSyncSettings };

/**
 * Проверяет согласованность после clamp: нахлёст должен быть строго больше периода cron-тика
 * (design: не образовывать «дыру» при джиттере расписания).
 */
export function validateResolvedOrgSyncSettings(
  settings: ResolvedOrgSyncSettings,
  platform: SyncPlatformEnv
): OrgSyncValidationResult {
  if (settings.overlapMinutes <= platform.cronTickMinutes) {
    return {
      code: 'OVERLAP_NOT_GREATER_THAN_CRON_TICK',
      message: `overlapMinutes (${settings.overlapMinutes}) must be greater than SYNC_CRON_TICK_MINUTES (${platform.cronTickMinutes})`,
      ok: false,
    };
  }
  return { ok: true, settings };
}

/** Парсит sync из корня settings JSONB, мержит с платформой и валидирует. */
export function parseResolveAndValidateOrgSyncFromSettingsRoot(
  settingsRoot: unknown,
  platform: SyncPlatformEnv
): OrgSyncValidationResult {
  const partial = parseOrgSyncSettingsPartial(extractOrgSyncSettingsJson(settingsRoot));
  const resolved = resolveOrgSyncSettings(partial, platform);
  return validateResolvedOrgSyncSettings(resolved, platform);
}

/**
 * Вливает patch в `settings.sync`, не трогая остальные ключи корня `organizations.settings`.
 */
export { mergeOrganizationSettingsSyncPatch } from './orgSyncSettingsMergeHelpers';
