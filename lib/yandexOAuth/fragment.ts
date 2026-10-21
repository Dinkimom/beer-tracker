import { YANDEX_OAUTH_ERROR_PARAM, YANDEX_OAUTH_FRAGMENT_KEY } from './constants';

/** Pages that consume `#yandex_oauth` themselves; other returns go through `/auth-setup?next=…`. */
const YANDEX_OAUTH_CONSUMER_PATHS: ReadonlySet<string> = new Set([
  '/auth-setup',
  '/register',
]);

/** Callback success target: return path with the access token in the URL fragment. */
export function buildYandexOAuthSuccessRedirect(returnPath: string, accessToken: string): string {
  const base = (returnPath.split('#')[0] ?? '').trim() || '/auth-setup';
  const pathname = base.split('?')[0] ?? base;
  const fragment = new URLSearchParams({ [YANDEX_OAUTH_FRAGMENT_KEY]: accessToken }).toString();
  if (YANDEX_OAUTH_CONSUMER_PATHS.has(pathname)) {
    return `${base}#${fragment}`;
  }
  return `/auth-setup?next=${encodeURIComponent(base)}#${fragment}`;
}

export function parseYandexOAuthHash(hash: string): string {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  return new URLSearchParams(raw).get(YANDEX_OAUTH_FRAGMENT_KEY)?.trim() ?? '';
}

export function parseYandexOAuthErrorSearch(search: string): string {
  return new URLSearchParams(search).get(YANDEX_OAUTH_ERROR_PARAM)?.trim() ?? '';
}

/** Strip the token fragment and error param from the current URL (useEffect only). */
export function clearYandexOAuthLocationArtifacts(): void {
  if (typeof window === 'undefined') {
    return;
  }
  const hasToken = parseYandexOAuthHash(window.location.hash) !== '';
  const params = new URLSearchParams(window.location.search);
  const hasError = params.has(YANDEX_OAUTH_ERROR_PARAM);
  if (!hasToken && !hasError) {
    return;
  }
  params.delete(YANDEX_OAUTH_ERROR_PARAM);
  const qs = params.toString();
  const search = qs ? `?${qs}` : '';
  const hash = hasToken ? '' : window.location.hash;
  window.history.replaceState(null, '', `${window.location.pathname}${search}${hash}`);
}
