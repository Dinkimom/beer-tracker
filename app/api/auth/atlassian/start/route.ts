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
import { getIssueTrackerProviderKind } from '@/lib/env';

/**
 * GET /api/auth/atlassian/start?return=/auth-setup
 * Redirects to Atlassian OAuth consent (jira-cloud only).
 */
export function GET(request: Request) {
  if (getIssueTrackerProviderKind() !== 'jira-cloud') {
    return NextResponse.json(
      { error: 'Atlassian OAuth доступен только при ISSUE_TRACKER_PROVIDER=jira-cloud' },
      { status: 400 }
    );
  }

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
