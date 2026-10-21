import { YANDEX_AUTHORIZE_URL, YANDEX_TRACKER_OAUTH_SCOPES } from './constants';

/** Authorization-code URL; `redirectUri` must be listed in the Yandex ID app. */
export function buildYandexTrackerAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    scope: YANDEX_TRACKER_OAUTH_SCOPES,
    state: input.state,
  });
  return `${YANDEX_AUTHORIZE_URL}?${params.toString()}`;
}

export function yandexOAuthCallbackUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}/api/auth/yandex/callback`;
}

/** Yandex page that shows an implicit-flow token to copy (must be a Redirect URI of the app). */
const YANDEX_VERIFICATION_CODE_URL = 'https://oauth.yandex.ru/verification_code';

/** Implicit-flow URL: admin copies the org token for sync into admin → «Трекер». */
export function buildYandexTrackerTokenHelpUrl(clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: YANDEX_VERIFICATION_CODE_URL,
    response_type: 'token',
    scope: YANDEX_TRACKER_OAUTH_SCOPES,
  });
  return `${YANDEX_AUTHORIZE_URL}?${params.toString()}`;
}
