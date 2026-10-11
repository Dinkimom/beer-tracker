import { NextResponse } from 'next/server';

import {
  assertAtlassianOAuthConfigured,
  atlassianOAuthCallbackUrl,
  buildAtlassianAuthorizeUrl,
  createAtlassianOAuthState,
  requestOriginFromRequest,
  sanitizeAtlassianOAuthReturnPath,
  setAtlassianOAuthStartCookies,
} from '@/lib/atlassianOAuth';

/**
 * GET /api/auth/atlassian/start?return=/auth-setup
 * Redirects to Atlassian OAuth consent (Jira Cloud; requires ATLASSIAN_OAUTH_* on the instance).
 */
export function GET(request: Request) {
  const configured = assertAtlassianOAuthConfigured();
  if (!configured.ok) {
    return NextResponse.json({ error: configured.error }, { status: 503 });
  }

  const url = new URL(request.url);
  const returnPath = sanitizeAtlassianOAuthReturnPath(url.searchParams.get('return'));
  const origin = requestOriginFromRequest(request);
  const redirectUri = atlassianOAuthCallbackUrl(origin);
  const state = createAtlassianOAuthState();
  const authorizeUrl = buildAtlassianAuthorizeUrl({
    clientId: configured.clientId,
    redirectUri,
    state,
  });

  const res = NextResponse.redirect(authorizeUrl);
  setAtlassianOAuthStartCookies(res, state, returnPath);
  return res;
}
