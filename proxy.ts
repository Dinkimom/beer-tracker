import { NextResponse, type NextRequest } from 'next/server';

import { isPublicApiPath } from '@/lib/auth/apiAccessGate';
import { getProductUserIdFromRequest } from '@/lib/auth/productSession';
import { PWA_START_HEADER } from '@/lib/pwa/pwaWebManifest';

function gateApiRequest(request: NextRequest): NextResponse {
  const hasBearerToken = /^Bearer\s+\S/i.test(request.headers.get('authorization') ?? '');
  if (isPublicApiPath(request.nextUrl.pathname, hasBearerToken) || getProductUserIdFromRequest(request)) {
    return NextResponse.next();
  }
  return NextResponse.json({ code: 'session_required', error: 'Требуется вход' }, { status: 401 });
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return gateApiRequest(request);
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PWA_START_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    '/',
    '/api/:path*',
    '/((?!_next/static|_next/image|api/|sw\\.js|offline\\.html|site\\.webmanifest).*)',
  ],
};
