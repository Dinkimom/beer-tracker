import { NextRequest } from 'next/server';

import { requestOriginFromRequest } from '@/lib/atlassianOAuth/requestOrigin';
import {
  exchangeAuthorizationCode,
  exchangeRefreshToken,
  McpOAuthError,
} from '@/lib/mcp/oauth/mcpOAuthService';
import { oauthErrorResponse, oauthJson, oauthOptions } from '@/lib/mcp/oauth/oauthHttp';
import { parseOAuthRequestBody, readClientCredentials } from '@/lib/mcp/oauth/parseFormBody';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await parseOAuthRequestBody(request);
    const { clientId, clientSecret } = readClientCredentials(body, request);
    if (!clientId) {
      throw new McpOAuthError('invalid_client', 'client_id is required', 401);
    }
    const origin = requestOriginFromRequest(request);
    const grantType = body.grant_type?.trim() ?? '';

    if (grantType === 'authorization_code') {
      const code = body.code?.trim() ?? '';
      const codeVerifier = body.code_verifier?.trim() ?? '';
      if (!code || !codeVerifier) {
        throw new McpOAuthError('invalid_request', 'code and code_verifier are required');
      }
      const tokens = await exchangeAuthorizationCode({
        clientId,
        clientSecret,
        code,
        codeVerifier,
        origin,
        redirectUri: body.redirect_uri?.trim(),
        resource: body.resource?.trim(),
      });
      return oauthJson(tokens);
    }

    if (grantType === 'refresh_token') {
      const refreshToken = body.refresh_token?.trim() ?? '';
      if (!refreshToken) {
        throw new McpOAuthError('invalid_request', 'refresh_token is required');
      }
      const scopes = body.scope?.trim() ? body.scope.trim().split(/\s+/).filter(Boolean) : undefined;
      const tokens = await exchangeRefreshToken({
        clientId,
        clientSecret,
        origin,
        refreshToken,
        resource: body.resource?.trim(),
        scopes,
      });
      return oauthJson(tokens);
    }

    throw new McpOAuthError('unsupported_grant_type', 'Unsupported grant_type');
  } catch (error) {
    return oauthErrorResponse(error);
  }
}

export function OPTIONS() {
  return oauthOptions();
}
