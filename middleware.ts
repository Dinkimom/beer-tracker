import { NextResponse, type NextRequest } from 'next/server';

import { PWA_START_HEADER } from '@/lib/pwa/pwaWebManifest';

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PWA_START_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    '/',
    '/((?!_next/static|_next/image|api/|sw\\.js|offline\\.html|site\\.webmanifest).*)',
  ],
};
