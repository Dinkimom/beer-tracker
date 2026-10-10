import { NextResponse } from 'next/server';

import {
  assertAtlassianOAuthConfigured,
  atlassianOAuthCallbackUrl,
  atlassianOAuthStatesMatch,
  buildAtlassianOAuthSuccessRedirect,
  clearAtlassianOAuthCookies,
  encodeAtlassianOAuthFragment,
  exchangeAtlassianAuthorizationCode,
  fetchAtlassianAccessibleResources,
  pickAtlassianCloudId,
  readCookieValue,
  requestOriginFromRequest,
  sanitizeAtlassianOAuthReturnPath,
} from '@/lib/atlassianOAuth';
import {
  ATLASSIAN_OAUTH_RETURN_COOKIE,
  ATLASSIAN_OAUTH_STATE_COOKIE,
} from '@/lib/atlassianOAuth/constants';
import { getIssueTrackerProviderKind } from '@/lib/env';

function errorRedirect(origin: string, returnPath: string, message: string): NextResponse {
  const path = sanitizeAtlassianOAuthReturnPath(returnPath);
  const dest = new URL(path, origin);
  dest.searchParams.set('atlassian_oauth_error', message);
  const res = NextResponse.redirect(dest);
  clearAtlassianOAuthCookies(res);
  return res;
}

/**
 * GET /api/auth/atlassian/callback?code=&state=
 * Exchanges code, resolves cloudId, redirects to return path with tokens in URL fragment.
 */
export async function GET(request: Request) {
  const origin = requestOriginFromRequest(request);
  const returnPath = sanitizeAtlassianOAuthReturnPath(
    readCookieValue(request, ATLASSIAN_OAUTH_RETURN_COOKIE)
  );

  if (getIssueTrackerProviderKind() !== 'jira-cloud') {
    return errorRedirect(origin, returnPath, 'Atlassian OAuth недоступен на этом инстансе');
  }

  const configured = assertAtlassianOAuthConfigured();
  if (!configured.ok) {
    return errorRedirect(origin, returnPath, configured.error);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code')?.trim() ?? '';
  const state = url.searchParams.get('state')?.trim() ?? '';
  const oauthError = url.searchParams.get('error')?.trim();
  if (oauthError) {
    const desc = url.searchParams.get('error_description')?.trim() || oauthError;
    return errorRedirect(origin, returnPath, desc);
  }

  const expectedState = readCookieValue(request, ATLASSIAN_OAUTH_STATE_COOKIE);
  if (!code || !atlassianOAuthStatesMatch(expectedState, state)) {
    return errorRedirect(origin, returnPath, 'Некорректный ответ Atlassian OAuth (state)');
  }

  try {
    const redirectUri = atlassianOAuthCallbackUrl(origin);
    const tokens = await exchangeAtlassianAuthorizationCode({
      clientId: configured.clientId,
      clientSecret: configured.clientSecret,
      code,
      redirectUri,
    });
    const resources = await fetchAtlassianAccessibleResources(tokens.accessToken);
    const cloudId = pickAtlassianCloudId(resources);
    if (!cloudId) {
      return errorRedirect(
        origin,
        returnPath,
        'Нет доступных Jira-сайтов для этого Atlassian-аккаунта'
      );
    }
    const expiresAt = Date.now() + tokens.expiresIn * 1000;
    const fragment = encodeAtlassianOAuthFragment({
      accessToken: tokens.accessToken,
      cloudId,
      expiresAt,
      refreshToken: tokens.refreshToken,
    });
    const dest = new URL(buildAtlassianOAuthSuccessRedirect(returnPath, fragment), origin);
    const res = NextResponse.redirect(dest);
    clearAtlassianOAuthCookies(res);
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Ошибка Atlassian OAuth';
    return errorRedirect(origin, returnPath, message);
  }
}
