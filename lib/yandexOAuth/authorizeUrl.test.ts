import { describe, expect, it } from 'vitest';

import { buildYandexTrackerAuthorizeUrl, YANDEX_TRACKER_TOKEN_HELP_PATH } from './authorizeUrl';

describe('buildYandexTrackerAuthorizeUrl', () => {
  it('builds oauth.yandex.ru authorize URL with tracker scopes', () => {
    const url = new URL(buildYandexTrackerAuthorizeUrl('app-client'));
    expect(url.origin + url.pathname).toBe('https://oauth.yandex.ru/authorize');
    expect(url.searchParams.get('response_type')).toBe('token');
    expect(url.searchParams.get('client_id')).toBe('app-client');
    expect(url.searchParams.get('scope')).toBe('tracker:read tracker:write');
  });

  it('exposes a same-origin token-help path for the UI', () => {
    expect(YANDEX_TRACKER_TOKEN_HELP_PATH).toBe('/api/auth/yandex/authorize');
  });
});
