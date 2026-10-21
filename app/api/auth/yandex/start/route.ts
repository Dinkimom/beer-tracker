import { NextResponse } from 'next/server';

import {
  createAtlassianOAuthState,
  sanitizeAtlassianOAuthReturnPath,
  setOAuthFlowCookies,
} from '@/lib/atlassianOAuth/oauthCookies';
import { requestOriginFromRequest } from '@/lib/atlassianOAuth/requestOrigin';
import { buildYandexTrackerAuthorizeUrl, yandexOAuthCallbackUrl } from '@/lib/yandexOAuth/authorizeUrl';
import { YANDEX_OAUTH_COOKIE_NAMES } from '@/lib/yandexOAuth/constants';
import { assertYandexOauthConfigured } from '@/lib/yandexOAuth/env';

/**
 * GET /api/auth/yandex/start?return=/auth-setup
 * Redirects to Yandex ID consent (authorization code; requires YANDEX_OAUTH_* on the instance).
 */
export function GET(request: Request) {
  const configured = assertYandexOauthConfigured();
  if (!configured.ok) {
    return NextResponse.json({ error: configured.error }, { status: 503 });
  }

  const url = new URL(request.url);
  const returnPath = sanitizeAtlassianOAuthReturnPath(url.searchParams.get('return'));
  const state = createAtlassianOAuthState();
  const authorizeUrl = buildYandexTrackerAuthorizeUrl({
    clientId: configured.clientId,
    redirectUri: yandexOAuthCallbackUrl(requestOriginFromRequest(request)),
    state,
  });

  const res = NextResponse.redirect(authorizeUrl);
  setOAuthFlowCookies(res, YANDEX_OAUTH_COOKIE_NAMES, state, returnPath);
  return res;
}
