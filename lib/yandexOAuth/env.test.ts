import { afterEach, describe, expect, it } from 'vitest';

import { assertYandexOauthConfigured } from './env';

const ORIGINAL_ID = process.env.YANDEX_OAUTH_CLIENT_ID;
const ORIGINAL_SECRET = process.env.YANDEX_OAUTH_CLIENT_SECRET;

function restore(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

afterEach(() => {
  restore('YANDEX_OAUTH_CLIENT_ID', ORIGINAL_ID);
  restore('YANDEX_OAUTH_CLIENT_SECRET', ORIGINAL_SECRET);
});

describe('yandexOAuth env', () => {
  it('fails assert when client secret is missing', () => {
    process.env.YANDEX_OAUTH_CLIENT_ID = 'yandex-app';
    delete process.env.YANDEX_OAUTH_CLIENT_SECRET;
    const result = assertYandexOauthConfigured();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('YANDEX_OAUTH_CLIENT_SECRET');
    }
  });

  it('returns trimmed client id and secret when configured', () => {
    process.env.YANDEX_OAUTH_CLIENT_ID = ' yandex-app ';
    process.env.YANDEX_OAUTH_CLIENT_SECRET = ' secret ';
    expect(assertYandexOauthConfigured()).toEqual({
      clientId: 'yandex-app',
      clientSecret: 'secret',
      ok: true,
    });
  });
});
