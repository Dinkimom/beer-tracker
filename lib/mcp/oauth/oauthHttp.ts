import { NextResponse } from 'next/server';

import { MCP_OAUTH_CORS_HEADERS } from './constants';
import { McpOAuthError } from './mcpOAuthService';

export function oauthJson(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    headers: { ...MCP_OAUTH_CORS_HEADERS, 'Cache-Control': 'no-store' },
    status,
  });
}

export function oauthOptions(): NextResponse {
  return new NextResponse(null, { headers: MCP_OAUTH_CORS_HEADERS, status: 204 });
}

export function oauthErrorResponse(error: unknown): NextResponse {
  if (error instanceof McpOAuthError) {
    return oauthJson(error.toJson(), error.status);
  }
  console.error('[mcp-oauth]', error);
  return oauthJson(
    { error: 'server_error', error_description: 'Internal Server Error' },
    500
  );
}
