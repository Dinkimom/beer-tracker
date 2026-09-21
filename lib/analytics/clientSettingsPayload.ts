import { PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY } from '@/lib/tenantHttpConstants';

import { ANALYTICS_EVENT } from './analyticsEventNames';
import {
  isForbiddenAnalyticsStorageKey,
  redactAnalyticsPayloadForClient,
} from './analyticsSecretRedaction';
import {
  CLIENT_SETTINGS_FIELD_KEYS,
  CLIENT_SETTINGS_FIELDS,
  CLIENT_SETTINGS_PAYLOAD_VERSION,
} from './clientSettingsAllowlist';

type ClientSettingsIngest = (events: Array<{
  eventName: typeof ANALYTICS_EVENT.clientSettings;
  payload: Record<string, unknown>;
}>) => Promise<boolean>;

const LAST_SENT_HASH_KEY_PREFIX = 'beer-tracker-analytics-client-settings-hash';
const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

let clientSettingsInFlight = false;

function readLocalStorageJson(key: string): unknown {
  if (typeof window === 'undefined') {
    return undefined;
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) {
      return undefined;
    }
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

export function collectClientSettingsPayload(): Record<string, unknown> {
  const payload: Record<string, unknown> = { v: CLIENT_SETTINGS_PAYLOAD_VERSION };
  for (const canonical of CLIENT_SETTINGS_FIELD_KEYS) {
    const storageKey = CLIENT_SETTINGS_FIELDS[canonical];
    if (isForbiddenAnalyticsStorageKey(storageKey)) {
      continue;
    }
    const value = readLocalStorageJson(storageKey);
    if (value !== undefined) {
      payload[canonical] = value;
    }
  }
  return redactAnalyticsPayloadForClient(payload);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const body = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',');
  return `{${body}}`;
}

/** FNV-1a 32-bit: достаточно, чтобы отличить смену снимка без крипто-API. */
export function hashClientSettingsPayload(payload: Record<string, unknown>): string {
  const input = stableStringify(payload);
  let hash = FNV_OFFSET;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function shouldSendClientSettings(currentHash: string, lastSentHash: string | null): boolean {
  return lastSentHash == null || lastSentHash !== currentHash;
}

function clientSettingsHashStorageKey(organizationId: string | null): string {
  return `${LAST_SENT_HASH_KEY_PREFIX}:${organizationId ?? 'none'}`;
}

function readActiveOrganizationIdForAnalytics(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY)?.trim();
    return raw || null;
  } catch {
    return null;
  }
}

function readLastSentHash(storageKey: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeLastSentHash(storageKey: string, hash: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(storageKey, hash);
  } catch {
    /* quota / private mode */
  }
}

/** Первый заход (нет lastSentHash) или смена хеша — POST; хеш пишем только после 2xx. */
export async function syncClientSettingsAnalytics(ingest: ClientSettingsIngest): Promise<boolean> {
  if (clientSettingsInFlight || typeof window === 'undefined') {
    return false;
  }
  const payload = collectClientSettingsPayload();
  const hash = hashClientSettingsPayload(payload);
  const storageKey = clientSettingsHashStorageKey(readActiveOrganizationIdForAnalytics());
  if (!shouldSendClientSettings(hash, readLastSentHash(storageKey))) {
    return false;
  }
  clientSettingsInFlight = true;
  try {
    const ok = await ingest([{ eventName: ANALYTICS_EVENT.clientSettings, payload }]);
    if (ok) {
      writeLastSentHash(storageKey, hash);
    }
    return ok;
  } finally {
    clientSettingsInFlight = false;
  }
}

/** Для тестов: сброс in-flight, чтобы кейсы не мешали друг другу. */
export function resetClientSettingsAnalyticsInFlight(): void {
  clientSettingsInFlight = false;
}
