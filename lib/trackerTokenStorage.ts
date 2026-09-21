/**
 * OAuth-токен Яндекс Трекера в localStorage с привязкой к организации продукта (tenant).
 * Legacy: значение как JSON-строка токена (`"y0_..."`) или сырой текст — см. {@link migrateTrackerTokenInLocalStorage}.
 */

import { PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY } from '@/lib/tenantHttpConstants';

import {
  parseTrackerTokenFromObject,
  parseTrackerTokenFromString,
  parseTrackerTokenJson,
} from './trackerTokenStorageParseHelpers';

/** Совпадает с {@link STORAGE_KEYS.TRACKER_TOKEN} в `hooks/localStorage/storageKeys.ts`. */
export const TRACKER_OAUTH_LOCAL_STORAGE_KEY = 'beer-tracker-tracker-token' as const;

interface TrackerTokenPayload {
  email?: string;
  organizationId: string;
  token: string;
}

function readActiveOrganizationIdRaw(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    return localStorage.getItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

/**
 * Разбор сырого значения из localStorage (после migrate — объект `{ token, organizationId }`).
 */
export function parseTrackerTokenStorageRaw(raw: string | null): TrackerTokenPayload | null {
  if (raw == null || raw.trim() === '') {
    return null;
  }
  return parseTrackerTokenJson(raw);
}

export function readTrackerTokenPayload(): TrackerTokenPayload {
  if (typeof window === 'undefined') {
    return { organizationId: '', token: '' };
  }
  try {
    const raw = localStorage.getItem(TRACKER_OAUTH_LOCAL_STORAGE_KEY);
    return parseTrackerTokenStorageRaw(raw) ?? { organizationId: '', token: '' };
  } catch {
    return { organizationId: '', token: '' };
  }
}

/**
 * Выставляет активный tenant в localStorage.
 * Нужно при логине по токену: иначе токен уже привязан к org, а active org пуст —
 * {@link getEffectiveTrackerTokenForBrowser} отдаёт '' и AuthGuard гонит на /auth-setup.
 */
function writeProductActiveOrganizationId(organizationId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const org = organizationId.trim();
  if (!org) {
    return;
  }
  try {
    const current = localStorage.getItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY)?.trim() ?? '';
    if (current === org) {
      return;
    }
    localStorage.setItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY, org);
    window.dispatchEvent(
      new CustomEvent('localStorageChange', {
        detail: { key: PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY },
      })
    );
  } catch {
    /* ignore */
  }
}

export function writeTrackerTokenPayload(payload: TrackerTokenPayload): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const t = payload.token.trim();
    const org = payload.organizationId.trim();
    if (!t) {
      localStorage.removeItem(TRACKER_OAUTH_LOCAL_STORAGE_KEY);
      return;
    }
    const email = payload.email?.trim() ?? '';
    const body: { email?: string; organizationId: string; token: string } = {
      organizationId: org,
      token: t,
    };
    if (email) {
      body.email = email;
    }
    localStorage.setItem(TRACKER_OAUTH_LOCAL_STORAGE_KEY, JSON.stringify(body));
    if (org) {
      writeProductActiveOrganizationId(org);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Одноразовая миграция: JSON-строка токена, сырой текст или объект без organizationId.
 */
function writeMigratedTokenIfNeeded(activeOrg: string, token: string | undefined): void {
  if (token && activeOrg) {
    writeTrackerTokenPayload({ organizationId: activeOrg, token });
  }
}

function migrateParsedTrackerToken(parsed: unknown, activeOrg: string): void {
  if (typeof parsed === 'string') {
    writeMigratedTokenIfNeeded(activeOrg, parseTrackerTokenFromString(parsed)?.token);
    return;
  }
  const payload = parseTrackerTokenFromObject(parsed);
  if (payload && !payload.organizationId && activeOrg) {
    writeTrackerTokenPayload({
      email: payload.email,
      organizationId: activeOrg,
      token: payload.token,
    });
  }
}

function migrateRawTrackerTokenValue(raw: string, activeOrg: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    writeMigratedTokenIfNeeded(activeOrg, parseTrackerTokenFromString(raw)?.token);
    return;
  }
  migrateParsedTrackerToken(parsed, activeOrg);
}

export function migrateTrackerTokenInLocalStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }
  const key = TRACKER_OAUTH_LOCAL_STORAGE_KEY;
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return;
  }
  if (raw == null || raw.trim() === '') {
    return;
  }

  migrateRawTrackerTokenValue(raw, readActiveOrganizationIdRaw());
}

/**
 * Токен для заголовка X-Tracker-Token: только если привязан к текущей активной org (или legacy без привязки).
 */
function isTrackerTokenAllowedForActiveOrg(payload: TrackerTokenPayload, activeOrg: string): boolean {
  if (!payload.organizationId) {
    return true;
  }
  return Boolean(activeOrg) && payload.organizationId === activeOrg;
}

function readEffectiveTrackerPayloadForBrowser(): TrackerTokenPayload | null {
  if (typeof window === 'undefined') {
    return null;
  }
  migrateTrackerTokenInLocalStorage();
  const payload = readTrackerTokenPayload();
  if (!payload.token) {
    return null;
  }
  const activeOrg = readActiveOrganizationIdRaw();
  return isTrackerTokenAllowedForActiveOrg(payload, activeOrg) ? payload : null;
}

export function getEffectiveTrackerTokenForBrowser(): string {
  return readEffectiveTrackerPayloadForBrowser()?.token ?? '';
}

/** Email Atlassian-аккаунта для Jira Cloud Basic; та же привязка к org, что и у токена. */
export function getEffectiveTrackerEmailForBrowser(): string {
  return readEffectiveTrackerPayloadForBrowser()?.email?.trim() ?? '';
}

/** Для {@link useSyncExternalStore} в AuthGuard и согласованности с axios. */
export function subscribeTrackerTokenGate(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const onCustom = (e: Event) => {
    const k = (e as CustomEvent<{ key?: string }>).detail?.key;
    if (k === TRACKER_OAUTH_LOCAL_STORAGE_KEY || k === PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY) {
      onStoreChange();
    }
  };
  const onStorage = (e: StorageEvent) => {
    if (
      e.key === TRACKER_OAUTH_LOCAL_STORAGE_KEY ||
      e.key === PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY
    ) {
      onStoreChange();
    }
  };
  window.addEventListener('localStorageChange', onCustom as EventListener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('localStorageChange', onCustom as EventListener);
    window.removeEventListener('storage', onStorage);
  };
}

export function getTrackerTokenGateSnapshot(): string {
  return getEffectiveTrackerTokenForBrowser();
}
