import { NextResponse } from 'next/server';

import { buildPwaWebManifest, resolvePwaManifestStartUrl } from '@/lib/pwa/pwaWebManifest';

/** GET /site.webmanifest — start_url = текущая страница, чтобы Chrome показывал установку с query. */
export function GET(request: Request) {
  const url = new URL(request.url);
  const startUrl = resolvePwaManifestStartUrl({
    explicitStart: url.searchParams.get('start'),
    manifestRequestUrl: request.url,
    referer: request.headers.get('referer'),
  });
  return new NextResponse(JSON.stringify(buildPwaWebManifest(startUrl)), {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/manifest+json',
    },
  });
}
