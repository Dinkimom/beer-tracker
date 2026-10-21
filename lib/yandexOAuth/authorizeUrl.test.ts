import { describe, expect, it } from 'vitest';

import {
  buildYandexTrackerAuthorizeUrl,
  buildYandexTrackerTokenHelpUrl,
  yandexOAuthCallbackUrl,
} from './authorizeUrl';
import { YANDEX_TRACKER_TOKEN_HELP_PATH } from './constants';

describe('buildYandexTrackerAuthorizeUrl', () => {
  it('builds authorization-code URL with tracker scopes, callback and state', () => {
    const url = new URL(
      buildYandexTrackerAuthorizeUrl({
        clientId: 'app-client',
        redirectUri: 'https://bt.example.com/api/auth/yandex/callback',
        state: 'st',
      })
    );
    expect(url.origin + url.pathname).toBe('https://oauth.yandex.ru/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('app-client');
    expect(url.searchParams.get('scope')).toBe('tracker:read tracker:write');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://bt.example.com/api/auth/yandex/callback'
    );
    expect(url.searchParams.get('state')).toBe('st');
  });

  it('builds callback URL from origin without double slash', () => {
    expect(yandexOAuthCallbackUrl('https://bt.example.com/')).toBe(
      'https://bt.example.com/api/auth/yandex/callback'
    );
  });
});

describe('buildYandexTrackerTokenHelpUrl', () => {
  it('builds implicit-flow URL that shows the token on Yandex', () => {
    const url = new URL(buildYandexTrackerTokenHelpUrl('app-client'));
    expect(url.searchParams.get('response_type')).toBe('token');
    expect(url.searchParams.get('redirect_uri')).toBe('https://oauth.yandex.ru/verification_code');
  });

  it('exposes a same-origin token-help path for the admin UI', () => {
    expect(YANDEX_TRACKER_TOKEN_HELP_PATH).toBe('/api/auth/yandex/authorize');
  });
});
