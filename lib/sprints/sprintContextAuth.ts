import type { AccessProfile } from '@/lib/access/orgAccess';
import type { RequirePlannerTenantResult, TenantContext } from '@/lib/api-tenant';

import { NextResponse } from 'next/server';

import { resolveAccessProfile } from '@/lib/access/orgAccess';
import { requestOriginFromRequest } from '@/lib/atlassianOAuth/requestOrigin';
import { MCP_OAUTH_CORS_HEADERS } from '@/lib/mcp/oauth/constants';
import { verifyMcpAccessToken } from '@/lib/mcp/oauth/mcpOAuthService';
import { wwwAuthenticateHeader } from '@/lib/mcp/oauth/metadata';

/** Bearer access token from MCP OAuth (or empty). */
export function readSprintContextMcpToken(request: Request): string {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ?? '';
}

export function mcpUnauthorizedResponse(request: Request): NextResponse {
  const origin = requestOriginFromRequest(request);
  return NextResponse.json(
    { error: 'Unauthorized: complete MCP OAuth (Bearer access token required)' },
    {
      headers: {
        ...MCP_OAUTH_CORS_HEADERS,
        'WWW-Authenticate': wwwAuthenticateHeader(origin),
      },
      status: 401,
    }
  );
}

/**
 * If a valid MCP OAuth access token is present — tenant from token subject.
 * Otherwise `null` — caller falls through to {@link requireTenantContext} (UI session).
 */
export async function tryRequireSprintContextMcpAuth(
  request: Request
): Promise<(RequirePlannerTenantResult & { mcpClientId?: string }) | null> {
  const token = readSprintContextMcpToken(request);
  if (!token) {
    return null;
  }

  const verified = await verifyMcpAccessToken(token);
  if (!verified) {
    return { response: mcpUnauthorizedResponse(request) };
  }

  const profileFromAccess = await resolveAccessProfile(
    verified.userId,
    verified.organizationId
  );
  if (!profileFromAccess) {
    return { response: mcpUnauthorizedResponse(request) };
  }
  const profile: AccessProfile = profileFromAccess;
  const ctx: TenantContext = {
    organizationId: profile.organizationId,
    role: profile.orgRole,
    userId: profile.userId,
  };
  return { ctx, mcpClientId: verified.clientId, profile };
}
