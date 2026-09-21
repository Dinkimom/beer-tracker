import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY } from '@/lib/tenantHttpConstants';

import {
  getEffectiveTrackerEmailForBrowser,
  getEffectiveTrackerTokenForBrowser,
  parseTrackerTokenStorageRaw,
  TRACKER_OAUTH_LOCAL_STORAGE_KEY,
  writeTrackerTokenPayload,
} from './trackerTokenStorage';

describe('parseTrackerTokenStorageRaw', () => {
  it('returns null for empty', () => {
    expect(parseTrackerTokenStorageRaw(null)).toBeNull();
    expect(parseTrackerTokenStorageRaw('')).toBeNull();
    expect(parseTrackerTokenStorageRaw('   ')).toBeNull();
  });

  it('parses JSON object with token and organizationId', () => {
    expect(
      parseTrackerTokenStorageRaw(
        JSON.stringify({ organizationId: '00000000-0000-4000-8000-000000000001', token: 'abc' })
      )
    ).toEqual({ organizationId: '00000000-0000-4000-8000-000000000001', token: 'abc' });
  });

  it('parses JSON string value as legacy wrapped token', () => {
    expect(parseTrackerTokenStorageRaw(JSON.stringify('y0_legacy'))).toEqual({
      organizationId: '',
      token: 'y0_legacy',
    });
  });

  it('parses non-JSON as raw token', () => {
    expect(parseTrackerTokenStorageRaw('plain-token')).toEqual({
      organizationId: '',
      token: 'plain-token',
    });
  });

  it('returns null for object without token', () => {
    expect(parseTrackerTokenStorageRaw(JSON.stringify({ organizationId: 'x' }))).toBeNull();
  });
});

describe('writeTrackerTokenPayload activates tenant', () => {
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

  it('sets active organization so AuthGuard sees the token immediately', () => {
    const orgId = '00000000-0000-4000-8000-000000000001';
    writeTrackerTokenPayload({ organizationId: orgId, token: 'y0_token' });

    expect(store.get(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY)).toBe(orgId);
    expect(store.get(TRACKER_OAUTH_LOCAL_STORAGE_KEY)).toContain('y0_token');
    expect(getEffectiveTrackerTokenForBrowser()).toBe('y0_token');
  });

  it('hides token when active org mismatches token org', () => {
    writeTrackerTokenPayload({
      organizationId: '00000000-0000-4000-8000-000000000001',
      token: 'y0_token',
    });
    store.set(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY, '00000000-0000-4000-8000-000000000002');

    expect(getEffectiveTrackerTokenForBrowser()).toBe('');
  });

  it('stores Atlassian email next to the token for Jira Cloud Basic', () => {
    const orgId = '00000000-0000-4000-8000-000000000001';
    writeTrackerTokenPayload({
      email: ' ada@example.com ',
      organizationId: orgId,
      token: 'atlassian-api-token',
    });

    expect(JSON.parse(store.get(TRACKER_OAUTH_LOCAL_STORAGE_KEY) ?? '{}')).toEqual({
      email: 'ada@example.com',
      organizationId: orgId,
      token: 'atlassian-api-token',
    });
    expect(getEffectiveTrackerTokenForBrowser()).toBe('atlassian-api-token');
    expect(getEffectiveTrackerEmailForBrowser()).toBe('ada@example.com');
  });
});
