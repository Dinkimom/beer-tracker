import { parseDeveloperCalDavCredentialsStoreRaw } from '@/lib/calendar/developerCalDavCredentialsParseHelpers';
import { DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY } from '@/lib/calendar/developerCalDavCredentialsStorage';
import { TRACKER_OAUTH_LOCAL_STORAGE_KEY } from '@/lib/trackerTokenStorage';
import { parseTrackerTokenJson } from '@/lib/trackerTokenStorageParseHelpers';

const SECRET_MIN_LENGTH = 8;
const REDACTED = '[redacted]';

/** localStorage-ключи, которые аналитика не читает и не отправляет. */
export const ANALYTICS_FORBIDDEN_STORAGE_KEYS = [
  DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY,
  TRACKER_OAUTH_LOCAL_STORAGE_KEY,
] as const;

const ANALYTICS_FORBIDDEN_STORAGE_KEY_SET = new Set<string>(ANALYTICS_FORBIDDEN_STORAGE_KEYS);

/**
 * Имена JSON-полей (без регистра и `_`/`-`): CalDAV URL/пароль и токен трекера.
 */
const FORBIDDEN_PAYLOAD_KEY_NORMALIZED = new Set([
  'accesstoken',
  'apppassword',
  'caldav',
  'caldavcredentials',
  'caldavpassword',
  'caldavurl',
  'credentials',
  'oauthtoken',
  'password',
  'secret',
  'token',
  'trackertoken',
  'yandextoken',
]);

const YANDEX_OAUTH_TOKEN_RE = /\by\d_[A-Za-z0-9_-]{16,}/g;
const CALDAV_URL_RE =
  /https?:\/\/[^\s"'\\]*(?:caldav|calendar\.mail\.ru|\/principals\/)[^\s"'\\]*/gi;

export function isForbiddenAnalyticsStorageKey(key: string): boolean {
  return ANALYTICS_FORBIDDEN_STORAGE_KEY_SET.has(key);
}

function isForbiddenAnalyticsPayloadKey(key: string): boolean {
  return FORBIDDEN_PAYLOAD_KEY_NORMALIZED.has(key.toLowerCase().replace(/[_-]/g, ''));
}

export function redactSecretPatternsInString(value: string): string {
  return value.replace(YANDEX_OAUTH_TOKEN_RE, REDACTED).replace(CALDAV_URL_RE, REDACTED);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function stripForbiddenKeysFromObject(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(input)) {
    if (isForbiddenAnalyticsPayloadKey(key)) {
      continue;
    }
    out[key] = stripForbiddenAnalyticsKeys(nested);
  }
  return out;
}

/** Рекурсивно выбрасывает секретные ключи и маскирует токен YTracker / URL CalDAV в строках. */
export function stripForbiddenAnalyticsKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripForbiddenAnalyticsKeys(item));
  }
  if (typeof value === 'string') {
    return redactSecretPatternsInString(value);
  }
  const record = asRecord(value);
  if (!record) {
    return value;
  }
  return stripForbiddenKeysFromObject(record);
}

function readLocalStorageRaw(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readLocalTrackerTokenSecrets(): string[] {
  const parsed = parseTrackerTokenJson(readLocalStorageRaw(TRACKER_OAUTH_LOCAL_STORAGE_KEY) ?? '');
  return parsed?.token ? [parsed.token] : [];
}

function readLocalCalDavSecrets(): string[] {
  const map = parseDeveloperCalDavCredentialsStoreRaw(
    readLocalStorageRaw(DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY)
  );
  const secrets: string[] = [];
  for (const creds of Object.values(map)) {
    if (creds.caldavUrl) {
      secrets.push(creds.caldavUrl);
    }
    if (creds.appPassword) {
      secrets.push(creds.appPassword);
    }
  }
  return secrets;
}

function readLocalAnalyticsSecretValues(): string[] {
  return [...readLocalTrackerTokenSecrets(), ...readLocalCalDavSecrets()].filter(
    (secret) => secret.length >= SECRET_MIN_LENGTH
  );
}

function redactKnownSecretsInJson(json: string, secrets: string[]): string {
  const ordered = [...secrets].sort((left, right) => right.length - left.length);
  let out = json;
  for (const secret of ordered) {
    out = out.split(secret).join(REDACTED);
  }
  return out;
}

/**
 * Клиентский фильтр перед POST: ключи + живые значения токена/CalDAV из localStorage.
 */
export function redactAnalyticsPayloadForClient(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const stripped = asRecord(stripForbiddenAnalyticsKeys(payload)) ?? {};
  const secrets = readLocalAnalyticsSecretValues();
  if (secrets.length === 0) {
    return stripped;
  }
  try {
    const parsed: unknown = JSON.parse(redactKnownSecretsInJson(JSON.stringify(stripped), secrets));
    return asRecord(parsed) ?? stripped;
  } catch {
    return stripped;
  }
}
