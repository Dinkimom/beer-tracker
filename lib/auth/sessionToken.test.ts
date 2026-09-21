import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { signProductSessionToken, verifyProductSessionToken } from './sessionToken';

describe('sessionToken', () => {
  const prev = process.env.AUTH_SESSION_SECRET;

  beforeEach(() => {
    process.env.AUTH_SESSION_SECRET = 'test-auth-session-secret-min-32-chars!';
  });

  afterEach(() => {
    process.env.AUTH_SESSION_SECRET = prev;
  });

  it('roundtrips user id', () => {
    const t = signProductSessionToken('00000000-0000-4000-8000-000000000099');
    const v = verifyProductSessionToken(t);
    expect(v?.userId).toBe('00000000-0000-4000-8000-000000000099');
  });

  it('rejects tampered token', () => {
    const t = signProductSessionToken('u1');
    const broken = `${t.slice(0, -4)  }xxxx`;
    expect(verifyProductSessionToken(broken)).toBeNull();
  });
});
