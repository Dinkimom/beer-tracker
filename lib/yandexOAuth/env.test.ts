import { afterEach, describe, expect, it } from 'vitest';

import { assertYandexOauthConfigured, readYandexOauthClientId } from './env';

const ORIGINAL_ID = process.env.YANDEX_OAUTH_CLIENT_ID;

afterEach(() => {
  if (ORIGINAL_ID === undefined) {
    delete process.env.YANDEX_OAUTH_CLIENT_ID;
  } else {
    process.env.YANDEX_OAUTH_CLIENT_ID = ORIGINAL_ID;
  }
});

describe('yandexOAuth env', () => {
  it('reads trimmed client id from runtime env', () => {
    process.env.YANDEX_OAUTH_CLIENT_ID = ' client-id ';
    expect(readYandexOauthClientId()).toBe('client-id');
  });

  it('fails assert when client id is missing', () => {
    delete process.env.YANDEX_OAUTH_CLIENT_ID;
    const result = assertYandexOauthConfigured();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('YANDEX_OAUTH_CLIENT_ID');
    }
  });

  it('returns client id when configured', () => {
    process.env.YANDEX_OAUTH_CLIENT_ID = 'yandex-app';
    expect(assertYandexOauthConfigured()).toEqual({
      clientId: 'yandex-app',
      ok: true,
    });
  });
});
