import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PRODUCT_SESSION_COOKIE_NAME } from './constants';
import { getProductSessionTokenFromRequest } from './cookies';
import { getProductUserIdFromRequest } from './productSession';
import { signProductSessionToken } from './sessionToken';

describe('product session cookie parse', () => {
  const prev = process.env.AUTH_SESSION_SECRET;

  beforeEach(() => {
    process.env.AUTH_SESSION_SECRET = 'test-auth-session-secret-min-32-chars!';
  });

  afterEach(() => {
    process.env.AUTH_SESSION_SECRET = prev;
  });

  it('does not throw on malformed percent-encoding in the session cookie', () => {
    const req = new Request('http://localhost/', {
      headers: { cookie: `${PRODUCT_SESSION_COOKIE_NAME}=%E0%A4%A` },
    });
    expect(getProductSessionTokenFromRequest(req)).toBeNull();
    expect(getProductUserIdFromRequest(req)).toBeNull();
  });

  it('reads user id from a signed session cookie', () => {
    const userId = '00000000-0000-4000-8000-000000000099';
    const token = signProductSessionToken(userId);
    const req = new Request('http://localhost/', {
      headers: { cookie: `${PRODUCT_SESSION_COOKIE_NAME}=${token}` },
    });
    expect(getProductUserIdFromRequest(req)).toBe(userId);
  });
});
