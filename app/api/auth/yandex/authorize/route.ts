import { NextResponse } from 'next/server';

import { buildYandexTrackerAuthorizeUrl } from '@/lib/yandexOAuth/authorizeUrl';
import { assertYandexOauthConfigured } from '@/lib/yandexOAuth/env';

/**
 * GET /api/auth/yandex/authorize
 * Redirects to Yandex OAuth (implicit token) using runtime YANDEX_OAUTH_CLIENT_ID.
 */
export function GET() {
  const configured = assertYandexOauthConfigured();
  if (!configured.ok) {
    return NextResponse.json({ error: configured.error }, { status: 503 });
  }

  return NextResponse.redirect(buildYandexTrackerAuthorizeUrl(configured.clientId));
}
