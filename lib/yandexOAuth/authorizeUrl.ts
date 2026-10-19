const YANDEX_AUTHORIZE_URL = 'https://oauth.yandex.ru/authorize';
const YANDEX_TRACKER_OAUTH_SCOPES = 'tracker:read tracker:write';

/** Implicit-flow authorize URL for pasting a Yandex Tracker OAuth token in the UI. */
export function buildYandexTrackerAuthorizeUrl(clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'token',
    scope: YANDEX_TRACKER_OAUTH_SCOPES,
  });
  return `${YANDEX_AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Same-origin path used as `href` in the browser. The route redirects to Yandex
 * using runtime `YANDEX_OAUTH_CLIENT_ID` (not inlined into the client bundle).
 */
export const YANDEX_TRACKER_TOKEN_HELP_PATH = '/api/auth/yandex/authorize';
