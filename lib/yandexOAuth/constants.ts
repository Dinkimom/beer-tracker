/** Yandex ID OAuth (authorization code) endpoints and Beer Tracker cookies/params. */

export const YANDEX_AUTHORIZE_URL = 'https://oauth.yandex.ru/authorize';
export const YANDEX_TOKEN_URL = 'https://oauth.yandex.ru/token';

/** Enable the same rights in the Yandex ID app: «Яндекс Трекер» → read + write. */
export const YANDEX_TRACKER_OAUTH_SCOPES = 'tracker:read tracker:write';

export const YANDEX_OAUTH_COOKIE_NAMES = {
  returnPath: 'bt_yandex_oauth_return',
  state: 'bt_yandex_oauth_state',
} as const;

/** Browser entry: same-origin route redirects to Yandex ID (`?return=/path`). */
export const YANDEX_OAUTH_START_PATH = '/api/auth/yandex/start';

/** Admin «get token» link: same-origin route redirects to the implicit flow (org sync token). */
export const YANDEX_TRACKER_TOKEN_HELP_PATH = '/api/auth/yandex/authorize';

/** URL hash key with the access token after the callback redirect. */
export const YANDEX_OAUTH_FRAGMENT_KEY = 'yandex_oauth' as const;

/** Query param with an OAuth error message after the callback redirect. */
export const YANDEX_OAUTH_ERROR_PARAM = 'yandex_oauth_error' as const;
