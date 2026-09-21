/**
 * Утилиты для работы с переменными окружения
 * Централизованное место для получения env переменных
 */

import { timingSafeEqual } from 'crypto';

import { assertSyncPlatformEnvBounds } from './envSyncPlatformHelpers';
import {
  issueTrackerProviderKindEnvErrorMessage,
  parseIssueTrackerProviderKind,
} from './issueTrackerProvider/providerKind';
import {
  DEFAULT_ISSUE_TRACKER_PROVIDER_KIND,
  type IssueTrackerProviderKind,
} from './issueTrackerProvider/types';

export function getTrackerConfig() {
  return {
    apiUrl: process.env.TRACKER_API_URL || 'https://api.tracker.yandex.net/v3',
    // Умышленно не используем токен из переменных окружения –
    // авторизация всегда должна идти через пользовательский токен из заголовка.
    oauthToken: '',
    /** Не используется: Cloud Org ID трекера берётся из tenant (organizations.tracker_org_id). */
    orgId: '',
  };
}

/**
 * Какой issue tracker использует этот инстанс: ровно один.
 * `ISSUE_TRACKER_PROVIDER=tracker|jira-onprem|jira-cloud` (по умолчанию tracker).
 * Алиасы: `yandex-tracker` → tracker; `jira` → cloud/on-prem по TRACKER_API_URL.
 */
export function getIssueTrackerProviderKind(): IssueTrackerProviderKind {
  const raw = process.env.ISSUE_TRACKER_PROVIDER?.trim();
  if (!raw) {
    return DEFAULT_ISSUE_TRACKER_PROVIDER_KIND;
  }
  const parsed = parseIssueTrackerProviderKind(raw, getTrackerConfig().apiUrl);
  if (parsed) {
    return parsed;
  }
  throw new Error(issueTrackerProviderKindEnvErrorMessage());
}

/**
 * Подключение к PostgreSQL приложения (схема `BEER_TRACKER_SCHEMA`).
 * Переменные: `POSTGRES_*` или стандартные `PG*` (как у libpq).
 */
export function getPostgresConfig() {
  return {
    host: process.env.POSTGRES_HOST || process.env.PGHOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || process.env.PGPORT || '5432', 10),
    database: process.env.POSTGRES_DB || process.env.PGDATABASE || 'postgres',
    user: process.env.POSTGRES_USER || process.env.PGUSER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD || '',
  };
}

/**
 * Имя схемы для таблиц beer-tracker в PostgreSQL приложения (по умолчанию beer_tracker).
 * Для схем с дефисом в SQL используются кавычки.
 */
export function getBeerTrackerSchema(): string {
  const v = process.env.BEER_TRACKER_SCHEMA;
  return (typeof v === 'string' && v.trim()) ? v.trim() : 'beer_tracker';
}

const ORG_SECRETS_KEY_BYTES = 32;

/**
 * Парсит мастер-ключ AES-256 для organization_secrets: 64 hex-символа или base64 на 32 байта.
 */
export function parseOrgSecretsMasterKey(raw: string | undefined): Buffer {
  if (raw === undefined || !raw.trim()) {
    throw new Error('ORG_SECRETS_ENCRYPTION_KEY is required for organization tracker token encryption');
  }
  const s = raw.trim();
  let buf: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(s)) {
    buf = Buffer.from(s, 'hex');
  } else {
    buf = Buffer.from(s, 'base64');
  }
  if (buf.length !== ORG_SECRETS_KEY_BYTES) {
    throw new Error(
      `ORG_SECRETS_ENCRYPTION_KEY must decode to ${ORG_SECRETS_KEY_BYTES} bytes (AES-256); got ${buf.length}`
    );
  }
  return buf;
}

export function getOrgSecretsMasterKey(): Buffer {
  return parseOrgSecretsMasterKey(process.env.ORG_SECRETS_ENCRYPTION_KEY);
}

/** Глобальные границы и дефолты синхронизации (оператор платформы). См. design.md. */
export interface SyncPlatformEnv {
  cronTickMinutes: number;
  defaultIntervalMinutes: number;
  defaultMaxIssuesPerRun: number;
  defaultOverlapMinutes: number;
  /** Интервал между успешными full_rescan для одной org (админский API). `0` — без кулдауна. */
  fullRescanCooldownMinutes: number;
  /** Верхняя граница числа задач за один прогон initial_full / full_rescan (защита от бесконечного цикла). */
  fullSyncMaxIssuesPerRun: number;
  maxIntervalMinutes: number;
  maxMaxIssuesPerRun: number;
  maxOrgsPerTick: number;
  maxOverlapMinutes: number;
  minIntervalMinutes: number;
  minMaxIssuesPerRun: number;
  minOverlapMinutes: number;
}

function readPositiveIntEnv(name: string, raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return n;
}

function readNonNegativeIntEnv(name: string, raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return n;
}

let syncPlatformEnvCache: SyncPlatformEnv | undefined;

/**
 * Читает SYNC_* из окружения. Кэшируется на процесс.
 * Требует: min/default overlap строго больше cron-тика (иначе конфиг платформы противоречив).
 */
export function getSyncPlatformEnv(): SyncPlatformEnv {
  if (syncPlatformEnvCache !== undefined) {
    return syncPlatformEnvCache;
  }
  const cronTickMinutes = readPositiveIntEnv(
    'SYNC_CRON_TICK_MINUTES',
    process.env.SYNC_CRON_TICK_MINUTES,
    5
  );
  const minIntervalMinutes = readPositiveIntEnv(
    'SYNC_MIN_INTERVAL_MINUTES',
    process.env.SYNC_MIN_INTERVAL_MINUTES,
    5
  );
  const maxIntervalMinutes = readPositiveIntEnv(
    'SYNC_MAX_INTERVAL_MINUTES',
    process.env.SYNC_MAX_INTERVAL_MINUTES,
    1440
  );
  const defaultIntervalMinutes = readPositiveIntEnv(
    'SYNC_DEFAULT_INTERVAL_MINUTES',
    process.env.SYNC_DEFAULT_INTERVAL_MINUTES,
    15
  );
  const minOverlapMinutes = readPositiveIntEnv(
    'SYNC_MIN_OVERLAP_MINUTES',
    process.env.SYNC_MIN_OVERLAP_MINUTES,
    cronTickMinutes + 1
  );
  const maxOverlapMinutes = readPositiveIntEnv(
    'SYNC_MAX_OVERLAP_MINUTES',
    process.env.SYNC_MAX_OVERLAP_MINUTES,
    240
  );
  const defaultOverlapMinutes = readPositiveIntEnv(
    'SYNC_DEFAULT_OVERLAP_MINUTES',
    process.env.SYNC_DEFAULT_OVERLAP_MINUTES,
    Math.max(cronTickMinutes + 1, minOverlapMinutes, 10)
  );
  const maxOrgsPerTick = readPositiveIntEnv(
    'SYNC_MAX_ORGS_PER_TICK',
    process.env.SYNC_MAX_ORGS_PER_TICK,
    50
  );
  const defaultMaxIssuesPerRun = readPositiveIntEnv(
    'SYNC_DEFAULT_MAX_ISSUES_PER_RUN',
    process.env.SYNC_DEFAULT_MAX_ISSUES_PER_RUN,
    500
  );
  const minMaxIssuesPerRun = readPositiveIntEnv(
    'SYNC_MIN_MAX_ISSUES_PER_RUN',
    process.env.SYNC_MIN_MAX_ISSUES_PER_RUN,
    10
  );
  const maxMaxIssuesPerRun = readPositiveIntEnv(
    'SYNC_MAX_MAX_ISSUES_PER_RUN',
    process.env.SYNC_MAX_MAX_ISSUES_PER_RUN,
    5000
  );
  const fullSyncMaxIssuesPerRun = readPositiveIntEnv(
    'SYNC_FULL_SYNC_MAX_ISSUES_PER_RUN',
    process.env.SYNC_FULL_SYNC_MAX_ISSUES_PER_RUN,
    50_000
  );
  const fullRescanCooldownMinutes = readNonNegativeIntEnv(
    'SYNC_FULL_RESCAN_COOLDOWN_MINUTES',
    process.env.SYNC_FULL_RESCAN_COOLDOWN_MINUTES,
    0
  );

  assertSyncPlatformEnvBounds({
    cronTickMinutes,
    defaultIntervalMinutes,
    defaultMaxIssuesPerRun,
    defaultOverlapMinutes,
    fullSyncMaxIssuesPerRun,
    maxIntervalMinutes,
    maxMaxIssuesPerRun,
    maxOverlapMinutes,
    minIntervalMinutes,
    minMaxIssuesPerRun,
    minOverlapMinutes,
  });

  syncPlatformEnvCache = {
    cronTickMinutes,
    minIntervalMinutes,
    maxIntervalMinutes,
    defaultIntervalMinutes,
    minOverlapMinutes,
    maxOverlapMinutes,
    defaultOverlapMinutes,
    maxOrgsPerTick,
    defaultMaxIssuesPerRun,
    fullRescanCooldownMinutes,
    fullSyncMaxIssuesPerRun,
    minMaxIssuesPerRun,
    maxMaxIssuesPerRun,
  };
  return syncPlatformEnvCache;
}

/** Сброс кэша getSyncPlatformEnv (только тесты). */
export function resetSyncPlatformEnvCacheForTests(): void {
  syncPlatformEnvCache = undefined;
}

/**
 * Redis для BullMQ (полные sync и статусы). Пусто — режим без Redis по design.
 */
export function getRedisUrl(): string | undefined {
  const v = process.env.REDIS_URL;
  if (typeof v !== 'string') {
    return undefined;
  }
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

/**
 * Секрет для POST /api/internal/sync/tick и аналогов. Пустая строка — эндпоинт не должен принимать вызовы.
 */
export function getSyncCronSecret(): string {
  const v = process.env.SYNC_CRON_SECRET;
  return typeof v === 'string' ? v.trim() : '';
}

type DbContractMode = 'compatibility' | 'native';

/**
 * Режим источников данных для коммерческой БД:
 * - native: чтение из beer_tracker.*
 * - compatibility: разрешены fallback/read-only чтения из overseer/public.
 */
export function getDbContractMode(): DbContractMode {
  const raw = process.env.DB_CONTRACT_MODE?.trim().toLowerCase();
  return raw === 'compatibility' ? 'compatibility' : 'native';
}

export function isDbCompatibilityMode(): boolean {
  return getDbContractMode() === 'compatibility';
}

/**
 * Если true, preflight DB-контракта в compatibility-режиме фейлит запуск.
 * false/0/off/no — только warning в лог.
 */
export function isDbContractPreflightStrict(): boolean {
  const raw = process.env.DB_CONTRACT_PREFLIGHT_STRICT;
  if (typeof raw !== 'string') {
    return false;
  }
  const value = raw.trim().toLowerCase();
  if (!value) {
    return false;
  }
  return value !== 'false' && value !== '0' && value !== 'off' && value !== 'no';
}

/**
 * Флаг встроенного экспортера (sync worker + sync admin section).
 * false/0/off/no — выключен.
 */
export function isExporterEnabled(): boolean {
  const raw = process.env.EXPORTER_ENABLED;
  if (typeof raw !== 'string') {
    return true;
  }
  const value = raw.trim().toLowerCase();
  if (!value) {
    return true;
  }
  return value !== 'false' && value !== '0' && value !== 'off' && value !== 'no';
}

/**
 * Сравнение секрета cron без утечки по времени (длины должны совпадать).
 */
export function verifySyncCronSecret(provided: string | null | undefined): boolean {
  const expected = getSyncCronSecret();
  if (!expected) {
    return false;
  }
  if (provided === null || provided === undefined) {
    return false;
  }
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

const AUTH_SESSION_SECRET_MIN_LEN = 32;

/**
 * Секрет подписи cookie сессии продукта (HMAC-SHA256). В production обязателен, ≥ 32 символов.
 */
export function getAuthSessionSecret(): string {
  const raw = process.env.AUTH_SESSION_SECRET?.trim();
  if (!raw || raw.length < AUTH_SESSION_SECRET_MIN_LEN) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `AUTH_SESSION_SECRET must be set and at least ${AUTH_SESSION_SECRET_MIN_LEN} characters`
      );
    }
    console.warn(
      '[auth] AUTH_SESSION_SECRET missing or short; using dev-only fallback (not for production)'
    );
    return 'dev-only-auth-session-secret-min-32-chars!!';
  }
  return raw;
}

export interface S3Config {
  accessKey: string;
  bucket: string;
  endpointUrl: string;
  forcePathStyle: boolean;
  /** Normalized prefix with a trailing slash, or empty. */
  keyPrefix: string;
  region: string;
  secretKey: string;
}

let s3ConfigCache: S3Config | undefined;

function readRequiredS3Env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for S3 object storage`);
  }
  return value;
}

/** `local` → `local/`; empty / only slashes → `''`. */
export function parseS3KeyPrefix(raw: string | undefined): string {
  if (raw === undefined) {
    return '';
  }
  let trimmed = raw.trim();
  while (trimmed.startsWith('/')) {
    trimmed = trimmed.slice(1);
  }
  while (trimmed.endsWith('/')) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed ? `${trimmed}/` : '';
}

/** Default true (MinIO and many S3-compatible APIs are path-style). */
export function parseS3ForcePathStyle(raw: string | undefined): boolean {
  if (raw === undefined || raw.trim() === '') {
    return true;
  }
  const value = raw.trim().toLowerCase();
  return value !== 'false' && value !== '0' && value !== 'off' && value !== 'no';
}

/**
 * S3-compatible object storage. Cached per process.
 * Throws if required `S3_*` variables are missing — upload/get fail loudly.
 */
export function getS3Config(): S3Config {
  if (s3ConfigCache !== undefined) {
    return s3ConfigCache;
  }
  s3ConfigCache = {
    endpointUrl: readRequiredS3Env('S3_ENDPOINT_URL'),
    region: process.env.S3_REGION?.trim() || 'us-east-1',
    bucket: readRequiredS3Env('S3_BUCKET'),
    accessKey: readRequiredS3Env('S3_ACCESS_KEY'),
    secretKey: readRequiredS3Env('S3_SECRET_KEY'),
    forcePathStyle: parseS3ForcePathStyle(process.env.S3_FORCE_PATH_STYLE),
    keyPrefix: parseS3KeyPrefix(process.env.S3_KEY_PREFIX),
  };
  return s3ConfigCache;
}

/** Reset cache (tests only). */
export function resetS3ConfigCacheForTests(): void {
  s3ConfigCache = undefined;
}

