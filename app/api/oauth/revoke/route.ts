import { NextRequest } from 'next/server';

import { McpOAuthError, revokeToken } from '@/lib/mcp/oauth/mcpOAuthService';
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
    const token = body.token?.trim() ?? '';
    if (!token) {
      throw new McpOAuthError('invalid_request', 'token is required');
    }
    await revokeToken({ clientId, clientSecret, token });
    return oauthJson({}, 200);
  } catch (error) {
    return oauthErrorResponse(error);
  }
}

export function OPTIONS() {
  return oauthOptions();
}
