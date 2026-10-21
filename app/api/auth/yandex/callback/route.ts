import { NextResponse } from 'next/server';

import {
  atlassianOAuthStatesMatch,
  clearOAuthFlowCookies,
  readCookieValue,
  sanitizeAtlassianOAuthReturnPath,
} from '@/lib/atlassianOAuth/oauthCookies';
import { requestOriginFromRequest } from '@/lib/atlassianOAuth/requestOrigin';
import { YANDEX_OAUTH_COOKIE_NAMES, YANDEX_OAUTH_ERROR_PARAM } from '@/lib/yandexOAuth/constants';
import { assertYandexOauthConfigured } from '@/lib/yandexOAuth/env';
import { buildYandexOAuthSuccessRedirect } from '@/lib/yandexOAuth/fragment';
import { exchangeYandexAuthorizationCode } from '@/lib/yandexOAuth/tokenExchange';

function errorRedirect(origin: string, returnPath: string, message: string): NextResponse {
  const dest = new URL(returnPath, origin);
  dest.searchParams.set(YANDEX_OAUTH_ERROR_PARAM, message);
  const res = NextResponse.redirect(dest);
  clearOAuthFlowCookies(res, YANDEX_OAUTH_COOKIE_NAMES);
  return res;
}

/**
 * GET /api/auth/yandex/callback?code=&state=
 * Exchanges the code and redirects to the return path with the access token in the URL fragment.
 */
export async function GET(request: Request) {
  const origin = requestOriginFromRequest(request);
  const returnPath = sanitizeAtlassianOAuthReturnPath(
    readCookieValue(request, YANDEX_OAUTH_COOKIE_NAMES.returnPath)
  );

  const configured = assertYandexOauthConfigured();
  if (!configured.ok) {
    return errorRedirect(origin, returnPath, configured.error);
  }

  const url = new URL(request.url);
  const oauthError = url.searchParams.get('error')?.trim();
  if (oauthError) {
    const desc = url.searchParams.get('error_description')?.trim() || oauthError;
    return errorRedirect(origin, returnPath, desc);
  }

  const code = url.searchParams.get('code')?.trim() ?? '';
  const state = url.searchParams.get('state')?.trim() ?? '';
  const expectedState = readCookieValue(request, YANDEX_OAUTH_COOKIE_NAMES.state);
  if (!code || !atlassianOAuthStatesMatch(expectedState, state)) {
    return errorRedirect(origin, returnPath, 'Некорректный ответ Яндекс ID OAuth (state)');
  }

  try {
    const accessToken = await exchangeYandexAuthorizationCode({
      clientId: configured.clientId,
      clientSecret: configured.clientSecret,
      code,
    });
    const dest = new URL(buildYandexOAuthSuccessRedirect(returnPath, accessToken), origin);
    const res = NextResponse.redirect(dest);
    clearOAuthFlowCookies(res, YANDEX_OAUTH_COOKIE_NAMES);
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Ошибка Яндекс ID OAuth';
    return errorRedirect(origin, returnPath, message);
  }
}
