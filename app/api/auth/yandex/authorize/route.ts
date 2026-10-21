import { NextResponse } from 'next/server';

import { buildYandexTrackerTokenHelpUrl } from '@/lib/yandexOAuth/authorizeUrl';
import { assertYandexOauthConfigured } from '@/lib/yandexOAuth/env';

/**
 * GET /api/auth/yandex/authorize
 * Admin «get token» link: implicit flow, Yandex shows the token to paste as the org sync token.
 * User sign-in goes through `/api/auth/yandex/start` instead.
 */
export function GET() {
  const configured = assertYandexOauthConfigured();
  if (!configured.ok) {
    return NextResponse.json({ error: configured.error }, { status: 503 });
  }

  return NextResponse.redirect(buildYandexTrackerTokenHelpUrl(configured.clientId));
}
