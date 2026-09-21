import { randomBytes } from 'crypto';

import { describe, expect, it } from 'vitest';

import {
  decryptOrgTrackerToken,
  encryptOrgTrackerToken,
} from './crypto-org-secrets';

function key32(): Buffer {
  return randomBytes(32);
}

describe('crypto-org-secrets', () => {
  it('roundtrips UTF-8 token', () => {
    const key = key32();
    const plain = 'y0_AgAAAAA…tracker-oauth';
    const ct = encryptOrgTrackerToken(plain, key);
    expect(decryptOrgTrackerToken(ct, key)).toBe(plain);
  });

  it('fails decrypt with wrong key', () => {
    const ct = encryptOrgTrackerToken('secret', key32());
    expect(() => decryptOrgTrackerToken(ct, key32())).toThrow();
  });

  it('rejects ciphertext shorter than iv+tag', () => {
    expect(() => decryptOrgTrackerToken(Buffer.alloc(10), key32())).toThrow(
      /too short/
    );
  });

  it('rejects tampered ciphertext', () => {
    const key = key32();
    const ct = encryptOrgTrackerToken('ok', key);
    ct[ct.length - 1] ^= 0xff;
    expect(() => decryptOrgTrackerToken(ct, key)).toThrow();
  });
});
