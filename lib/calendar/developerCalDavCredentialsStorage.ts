/**
 * CalDAV Mail.ru (URL + пароль внешнего приложения) по исполнителям в localStorage.
 * Только клиент; для POC занятости по календарю до серверного хранения.
 */

import type {
  DeveloperCalDavCredentials,
  DeveloperCalDavCredentialsMap,
} from './developerCalDavCredentialsTypes';

import {
  normalizeDeveloperCalDavCredentials,
  parseDeveloperCalDavCredentialsStoreRaw,
} from './developerCalDavCredentialsParseHelpers';

/** Совпадает с {@link STORAGE_KEYS.DEVELOPER_CALDAV_CREDENTIALS}. */
export const DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY =
  'beer-tracker-developer-caldav-credentials' as const;

function dispatchStorageChange(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(
    new CustomEvent('localStorageChange', {
      detail: { key: DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY },
    })
  );
}

export function readDeveloperCalDavCredentialsStore(): DeveloperCalDavCredentialsMap {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = localStorage.getItem(DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY);
    return parseDeveloperCalDavCredentialsStoreRaw(raw);
  } catch {
    return {};
  }
}

export function readDeveloperCalDavCredentials(
  developerId: string
): DeveloperCalDavCredentials | null {
  const id = developerId.trim();
  if (!id) {
    return null;
  }
  return readDeveloperCalDavCredentialsStore()[id] ?? null;
}

export function writeDeveloperCalDavCredentialsStore(
  store: DeveloperCalDavCredentialsMap
): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const normalized: DeveloperCalDavCredentialsMap = {};
    for (const [developerId, entry] of Object.entries(store)) {
      const id = developerId.trim();
      if (!id) {
        continue;
      }
      const credentials = normalizeDeveloperCalDavCredentials(entry);
      if (credentials) {
        normalized[id] = {
          ...credentials,
          updatedAt: credentials.updatedAt ?? new Date().toISOString(),
        };
      }
    }

    if (Object.keys(normalized).length === 0) {
      localStorage.removeItem(DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY);
    } else {
      localStorage.setItem(DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY, JSON.stringify(normalized));
    }
    dispatchStorageChange();
  } catch {
    /* ignore quota / private mode */
  }
}

export function writeDeveloperCalDavCredentials(
  developerId: string,
  credentials: DeveloperCalDavCredentials
): void {
  const id = developerId.trim();
  const normalized = normalizeDeveloperCalDavCredentials(credentials);
  if (!id || !normalized) {
    return;
  }

  const store = readDeveloperCalDavCredentialsStore();
  store[id] = {
    ...normalized,
    updatedAt: new Date().toISOString(),
  };
  writeDeveloperCalDavCredentialsStore(store);
}

export function removeDeveloperCalDavCredentials(developerId: string): void {
  const id = developerId.trim();
  if (!id) {
    return;
  }

  const store = readDeveloperCalDavCredentialsStore();
  if (!(id in store)) {
    return;
  }

  delete store[id];
  writeDeveloperCalDavCredentialsStore(store);
}
