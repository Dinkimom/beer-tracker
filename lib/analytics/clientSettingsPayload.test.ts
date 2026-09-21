import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STORAGE_KEYS } from '@/hooks/localStorage/storageKeys';
import { PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY } from '@/lib/tenantHttpConstants';

import {
  collectClientSettingsPayload,
  hashClientSettingsPayload,
  resetClientSettingsAnalyticsInFlight,
  shouldSendClientSettings,
  syncClientSettingsAnalytics,
} from './clientSettingsPayload';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe('clientSettingsPayload', () => {
  beforeEach(() => {
    const local = memoryStorage();
    vi.stubGlobal('window', { localStorage: local });
    vi.stubGlobal('localStorage', local);
    resetClientSettingsAnalyticsInFlight();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('collects allowlisted keys and ignores tracker token and CalDAV credentials', () => {
    localStorage.setItem(STORAGE_KEYS.BOARD_VIEW_MODE, JSON.stringify('kanban'));
    localStorage.setItem(STORAGE_KEYS.EXPERIMENTAL_FEATURES, JSON.stringify(true));
    localStorage.setItem(
      STORAGE_KEYS.TRACKER_TOKEN,
      JSON.stringify({ organizationId: 'org-1', token: 'y0_AgAAAAAsecretTokenValue' })
    );
    localStorage.setItem(
      STORAGE_KEYS.DEVELOPER_CALDAV_CREDENTIALS,
      JSON.stringify({
        dev1: {
          appPassword: 'mail-app-password-value',
          caldavUrl: 'https://calendar.mail.ru/principals/mail.ru/user/calendars/id/',
          email: 'user@mail.ru',
        },
      })
    );
    const payload = collectClientSettingsPayload();
    expect(payload.boardViewMode).toBe('kanban');
    expect(payload.experimentalFeatures).toBe(true);
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('y0_AgAAAAAsecretTokenValue');
    expect(serialized).not.toContain('mail-app-password-value');
    expect(serialized).not.toContain('calendar.mail.ru');
    expect(serialized).not.toContain('caldavUrl');
    expect(serialized).not.toContain('appPassword');
  });

  it('sends on first visit and skips an unchanged hash', async () => {
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify('dark'));
    localStorage.setItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY, 'org-1');
    const ingest = vi.fn().mockResolvedValue(true);

    expect(await syncClientSettingsAnalytics(ingest)).toBe(true);
    expect(ingest).toHaveBeenCalledTimes(1);

    expect(await syncClientSettingsAnalytics(ingest)).toBe(false);
    expect(ingest).toHaveBeenCalledTimes(1);
  });

  it('sends again when the snapshot hash changes', async () => {
    const ingest = vi.fn().mockResolvedValue(true);
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify('light'));
    expect(await syncClientSettingsAnalytics(ingest)).toBe(true);

    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify('dark'));
    expect(await syncClientSettingsAnalytics(ingest)).toBe(true);
    expect(ingest).toHaveBeenCalledTimes(2);
  });

  it('does not store the hash when ingest fails so the next visit retries', async () => {
    const ingest = vi.fn().mockResolvedValue(false);
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, JSON.stringify('en'));
    expect(await syncClientSettingsAnalytics(ingest)).toBe(false);
    expect(await syncClientSettingsAnalytics(ingest)).toBe(false);
    expect(ingest).toHaveBeenCalledTimes(2);
  });
});

describe('shouldSendClientSettings', () => {
  it('sends when there is no previous hash', () => {
    const hash = hashClientSettingsPayload({ theme: 'dark', v: 1 });
    expect(shouldSendClientSettings(hash, null)).toBe(true);
    expect(shouldSendClientSettings(hash, hash)).toBe(false);
  });
});
