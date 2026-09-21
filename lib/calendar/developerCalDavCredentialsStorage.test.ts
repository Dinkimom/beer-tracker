import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  inferMailRuEmailFromCalDavUrl,
  normalizeDeveloperCalDavCredentials,
  parseDeveloperCalDavCredentialsStoreRaw,
} from './developerCalDavCredentialsParseHelpers';
import {
  DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY,
  readDeveloperCalDavCredentials,
  readDeveloperCalDavCredentialsStore,
  removeDeveloperCalDavCredentials,
  writeDeveloperCalDavCredentials,
} from './developerCalDavCredentialsStorage';

const SAMPLE_URL =
  'https://calendar.mail.ru/principals/example.com/jane.doe/calendars/00000000-0000-4000-8000-000000000001/';

describe('inferMailRuEmailFromCalDavUrl', () => {
  it('extracts email from Mail.ru CalDAV principal URL', () => {
    expect(inferMailRuEmailFromCalDavUrl(SAMPLE_URL)).toBe('jane.doe@example.com');
  });

  it('adds trailing slash before parsing', () => {
    const withoutSlash = SAMPLE_URL.replace(/\/$/, '');
    expect(inferMailRuEmailFromCalDavUrl(withoutSlash)).toBe('jane.doe@example.com');
  });

  it('returns null for non-Mail.ru URLs', () => {
    expect(inferMailRuEmailFromCalDavUrl('https://example.com/calendars/1/')).toBeNull();
  });
});

describe('normalizeDeveloperCalDavCredentials', () => {
  it('normalizes valid credentials', () => {
    expect(
      normalizeDeveloperCalDavCredentials({
        caldavUrl: SAMPLE_URL.replace(/\/$/, ''),
        email: 'Jane.Doe@example.com',
        appPassword: ' secret ',
      })
    ).toEqual({
      caldavUrl: SAMPLE_URL,
      email: 'jane.doe@example.com',
      appPassword: 'secret',
      updatedAt: undefined,
    });
  });

  it('rejects incomplete credentials', () => {
    expect(
      normalizeDeveloperCalDavCredentials({
        caldavUrl: SAMPLE_URL,
        email: '',
        appPassword: 'x',
      })
    ).toBeNull();
  });

  it('rejects non-https CalDAV URL', () => {
    const insecureUrl = ['http', '://calendar.mail.ru/principals/a/b/calendars/u/'].join('');
    expect(
      normalizeDeveloperCalDavCredentials({
        caldavUrl: insecureUrl,
        email: 'a@b.c',
        appPassword: 'x',
      })
    ).toBeNull();
  });
});

describe('parseDeveloperCalDavCredentialsStoreRaw', () => {
  it('returns empty map for invalid input', () => {
    expect(parseDeveloperCalDavCredentialsStoreRaw(null)).toEqual({});
    expect(parseDeveloperCalDavCredentialsStoreRaw('')).toEqual({});
    expect(parseDeveloperCalDavCredentialsStoreRaw('not-json')).toEqual({});
    expect(parseDeveloperCalDavCredentialsStoreRaw('[]')).toEqual({});
  });

  it('parses valid store and skips invalid entries', () => {
    const raw = JSON.stringify({
      dev1: {
        caldavUrl: SAMPLE_URL,
        email: 'jane.doe@example.com',
        appPassword: 'pwd',
      },
      '': { caldavUrl: SAMPLE_URL, email: 'a@b.c', appPassword: 'x' },
      dev2: { caldavUrl: 'bad', email: 'a@b.c', appPassword: 'x' },
    });
    expect(parseDeveloperCalDavCredentialsStoreRaw(raw)).toEqual({
      dev1: {
        caldavUrl: SAMPLE_URL,
        email: 'jane.doe@example.com',
        appPassword: 'pwd',
        updatedAt: undefined,
      },
    });
  });
});

describe('developerCalDavCredentialsStorage', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      removeItem: (key: string) => {
        store.delete(key);
      },
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    });
    vi.stubGlobal('window', {
      dispatchEvent: vi.fn(),
      localStorage: globalThis.localStorage,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes and reads credentials per developer', () => {
    writeDeveloperCalDavCredentials('dev-1', {
      caldavUrl: SAMPLE_URL,
      email: 'jane.doe@example.com',
      appPassword: 'app-pass',
    });

    expect(readDeveloperCalDavCredentials('dev-1')).toMatchObject({
      caldavUrl: SAMPLE_URL,
      email: 'jane.doe@example.com',
      appPassword: 'app-pass',
    });
    expect(readDeveloperCalDavCredentialsStore()).toHaveProperty('dev-1');
    expect(store.has(DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY)).toBe(true);
  });

  it('removes credentials and clears storage when empty', () => {
    writeDeveloperCalDavCredentials('dev-1', {
      caldavUrl: SAMPLE_URL,
      email: 'jane.doe@example.com',
      appPassword: 'app-pass',
    });
    removeDeveloperCalDavCredentials('dev-1');

    expect(readDeveloperCalDavCredentials('dev-1')).toBeNull();
    expect(store.has(DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY)).toBe(false);
  });
});
