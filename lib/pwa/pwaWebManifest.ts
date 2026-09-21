export const PWA_START_HEADER = 'x-pwa-start';
const PWA_MANIFEST_PATH = '/site.webmanifest';

const DEFAULT_START_URL = '/';

/** Relative path+query only: `/planner/1/sprint/2?tab=board`. */
export function sanitizePwaStartUrl(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  const start = raw.trim();
  if (!start.startsWith('/') || start.startsWith('//')) {
    return null;
  }
  if (start.includes('://') || start.includes('\\')) {
    return null;
  }
  return start;
}

export function buildPwaManifestLinkHref(startUrl: string): string {
  const start = sanitizePwaStartUrl(startUrl) ?? DEFAULT_START_URL;
  if (start === DEFAULT_START_URL) {
    return PWA_MANIFEST_PATH;
  }
  return `${PWA_MANIFEST_PATH}?start=${encodeURIComponent(start)}`;
}

export function resolvePwaManifestStartUrl(input: {
  explicitStart: string | null;
  manifestRequestUrl: string;
  referer: string | null;
}): string {
  const fromQuery = sanitizePwaStartUrl(input.explicitStart);
  if (fromQuery) {
    return fromQuery;
  }
  return startUrlFromReferer(input.referer, input.manifestRequestUrl) ?? DEFAULT_START_URL;
}

function startUrlFromReferer(refererHeader: string | null, manifestRequestUrl: string): string | null {
  if (!refererHeader) {
    return null;
  }
  try {
    const referer = new URL(refererHeader);
    const origin = new URL(manifestRequestUrl).origin;
    if (referer.origin !== origin) {
      return null;
    }
    return sanitizePwaStartUrl(`${referer.pathname}${referer.search}`);
  } catch {
    return null;
  }
}

export function buildPwaWebManifest(startUrl: string): Record<string, unknown> {
  const start = sanitizePwaStartUrl(startUrl) ?? DEFAULT_START_URL;
  return {
    background_color: '#ffffff',
    categories: ['productivity'],
    display: 'standalone',
    icons: [
      {
        purpose: 'any',
        sizes: '192x192',
        src: '/web-app-manifest-192x192.png',
        type: 'image/png',
      },
      {
        purpose: 'maskable',
        sizes: '192x192',
        src: '/web-app-manifest-192x192.png',
        type: 'image/png',
      },
      {
        purpose: 'any',
        sizes: '512x512',
        src: '/web-app-manifest-512x512.png',
        type: 'image/png',
      },
      {
        purpose: 'maskable',
        sizes: '512x512',
        src: '/web-app-manifest-512x512.png',
        type: 'image/png',
      },
    ],
    id: 'beer-tracker',
    name: 'Beer Tracker',
    orientation: 'any',
    prefer_related_applications: false,
    scope: '/',
    short_name: 'Tracker',
    start_url: start,
    theme_color: '#ffffff',
  };
}
