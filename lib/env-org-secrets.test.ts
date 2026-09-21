import { describe, expect, it } from 'vitest';

import {
  parseOrgSecretsMasterKey,
  resetSyncPlatformEnvCacheForTests,
  verifySyncCronSecret,
} from './env';

describe('parseOrgSecretsMasterKey', () => {
  it('accepts 64-char hex', () => {
    const hex = '0'.repeat(64);
    const buf = parseOrgSecretsMasterKey(hex);
    expect(buf.length).toBe(32);
  });

  it('accepts base64 for 32 bytes', () => {
    const b64 = Buffer.alloc(32, 7).toString('base64');
    expect(parseOrgSecretsMasterKey(b64).length).toBe(32);
  });

  it('throws on missing key', () => {
    expect(() => parseOrgSecretsMasterKey(undefined)).toThrow(
      /ORG_SECRETS_ENCRYPTION_KEY/
    );
  });

  it('throws on wrong decoded length', () => {
    expect(() => parseOrgSecretsMasterKey('YQ==')).toThrow(/32 bytes/);
  });
});

describe('verifySyncCronSecret', () => {
  it('returns false when SYNC_CRON_SECRET unset', () => {
    const prev = process.env.SYNC_CRON_SECRET;
    delete process.env.SYNC_CRON_SECRET;
    expect(verifySyncCronSecret('any')).toBe(false);
    process.env.SYNC_CRON_SECRET = prev;
  });

  it('accepts exact match', () => {
    const prev = process.env.SYNC_CRON_SECRET;
    process.env.SYNC_CRON_SECRET = 'cron-secret-value';
    expect(verifySyncCronSecret('cron-secret-value')).toBe(true);
    expect(verifySyncCronSecret('cron-secret-wrong')).toBe(false);
    expect(verifySyncCronSecret(null)).toBe(false);
    process.env.SYNC_CRON_SECRET = prev;
  });
});

describe('resetSyncPlatformEnvCacheForTests', () => {
  it('can be called without throwing', () => {
    expect(() => resetSyncPlatformEnvCacheForTests()).not.toThrow();
  });
});
