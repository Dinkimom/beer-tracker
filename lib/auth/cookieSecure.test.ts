import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveAuthCookieSecure } from './cookieSecure';

describe('resolveAuthCookieSecure', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('respects explicit false in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_SESSION_COOKIE_SECURE', 'false');
    expect(resolveAuthCookieSecure()).toBe(false);
  });

  it('respects explicit true in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('AUTH_SESSION_COOKIE_SECURE', 'true');
    expect(resolveAuthCookieSecure()).toBe(true);
  });

  it('defaults to production semantics when AUTH_SESSION_COOKIE_SECURE unset', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(resolveAuthCookieSecure()).toBe(true);
    vi.stubEnv('NODE_ENV', 'development');
    expect(resolveAuthCookieSecure()).toBe(false);
  });
});
