const API_PREFIX = '/api/';
const NEXT_HMR_PREFIX = '/_next/webpack';

const STATIC_PREFIXES = ['/_next/static/', '/assets/'] as const;

const STATIC_EXACT_PATHS = new Set([
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/favicon.svg',
  '/offline.html',
]);

/** Совпадает с обходом в `public/sw.js`: API, HMR и динамический манифест не кэшируем. */
export function shouldBypassServiceWorker(pathname: string): boolean {
  return (
    pathname.startsWith(API_PREFIX) ||
    pathname.startsWith(NEXT_HMR_PREFIX) ||
    pathname === '/site.webmanifest'
  );
}

/** Статика, которую SW может отдать из кэша при повторном визите. */
export function isPwaCacheableStaticPath(pathname: string): boolean {
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  if (STATIC_EXACT_PATHS.has(pathname)) {
    return true;
  }
  return pathname.startsWith('/favicon-') || pathname.startsWith('/web-app-manifest-');
}
