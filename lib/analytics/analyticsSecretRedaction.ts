import { asRecord } from '@/lib/isRecord';
import { TRACKER_OAUTH_LOCAL_STORAGE_KEY } from '@/lib/trackerTokenStorage';
import { parseTrackerTokenJson } from '@/lib/trackerTokenStorageParseHelpers';

const SECRET_MIN_LENGTH = 8;
const REDACTED = '[redacted]';

/** localStorage-ключи, которые аналитика не читает и не отправляет. */
export const ANALYTICS_FORBIDDEN_STORAGE_KEYS = [TRACKER_OAUTH_LOCAL_STORAGE_KEY] as const;

const ANALYTICS_FORBIDDEN_STORAGE_KEY_SET = new Set<string>(ANALYTICS_FORBIDDEN_STORAGE_KEYS);

/**
 * Имена JSON-полей (без регистра и `_`/`-`): токены, пароли, секреты.
 */
const FORBIDDEN_PAYLOAD_KEY_NORMALIZED = new Set([
  'accesstoken',
  'apppassword',
  'credentials',
  'oauthtoken',
  'password',
  'secret',
  'token',
  'trackertoken',
  'yandextoken',
]);

const YANDEX_OAUTH_TOKEN_RE = /\by\d_[A-Za-z0-9_-]{16,}/g;

export function isForbiddenAnalyticsStorageKey(key: string): boolean {
  return ANALYTICS_FORBIDDEN_STORAGE_KEY_SET.has(key);
}

function isForbiddenAnalyticsPayloadKey(key: string): boolean {
  return FORBIDDEN_PAYLOAD_KEY_NORMALIZED.has(key.toLowerCase().replace(/[_-]/g, ''));
}

export function redactSecretPatternsInString(value: string): string {
  return value.replace(YANDEX_OAUTH_TOKEN_RE, REDACTED);
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

/** Рекурсивно выбрасывает секретные ключи и маскирует токен YTracker в строках. */
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

function readLocalAnalyticsSecretValues(): string[] {
  return readLocalTrackerTokenSecrets().filter(
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
 * Клиентский фильтр перед POST: ключи + живое значение токена трекера из localStorage.
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
