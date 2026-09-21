import type {
  DeveloperCalDavCredentials,
  DeveloperCalDavCredentialsMap,
} from './developerCalDavCredentialsTypes';

const MAIL_RU_CALDAV_PRINCIPAL_RE =
  /^https:\/\/calendar\.mail\.ru\/principals\/([^/]+)\/([^/]+)\/calendars\/[^/]+\/?$/i;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function normalizeCalDavUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

/**
 * Выводит email из CalDAV URL Mail.ru: …/principals/{domain}/{local}/calendars/…
 */
export function inferMailRuEmailFromCalDavUrl(caldavUrl: string): string | null {
  const match = normalizeCalDavUrl(caldavUrl).match(MAIL_RU_CALDAV_PRINCIPAL_RE);
  if (!match) {
    return null;
  }
  const [, domain, localPart] = match;
  return `${localPart}@${domain}`;
}

export function normalizeDeveloperCalDavCredentials(
  input: Partial<DeveloperCalDavCredentials>
): DeveloperCalDavCredentials | null {
  const caldavUrl = normalizeCalDavUrl(input.caldavUrl ?? '');
  const email = (input.email ?? '').trim().toLowerCase();
  const appPassword = (input.appPassword ?? '').trim();

  if (!caldavUrl || !email || !appPassword) {
    return null;
  }

  if (!email.includes('@')) {
    return null;
  }

  try {
    const parsed = new URL(caldavUrl);
    if (parsed.protocol !== 'https:') {
      return null;
    }
  } catch {
    return null;
  }

  return {
    caldavUrl,
    email,
    appPassword,
    updatedAt: input.updatedAt,
  };
}

function parseCredentialsEntry(value: unknown): DeveloperCalDavCredentials | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  return normalizeDeveloperCalDavCredentials({
    caldavUrl: isNonEmptyString(record.caldavUrl) ? record.caldavUrl : '',
    email: isNonEmptyString(record.email) ? record.email : '',
    appPassword: isNonEmptyString(record.appPassword) ? record.appPassword : '',
    updatedAt: isNonEmptyString(record.updatedAt) ? record.updatedAt : undefined,
  });
}

export function parseDeveloperCalDavCredentialsStoreRaw(
  raw: string | null
): DeveloperCalDavCredentialsMap {
  if (raw == null || raw.trim() === '') {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const result: DeveloperCalDavCredentialsMap = {};
    for (const [developerId, entry] of Object.entries(parsed)) {
      const id = developerId.trim();
      if (!id) {
        continue;
      }
      const credentials = parseCredentialsEntry(entry);
      if (credentials) {
        result[id] = credentials;
      }
    }
    return result;
  } catch {
    return {};
  }
}
