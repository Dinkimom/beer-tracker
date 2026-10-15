import { NextRequest } from 'next/server';

import { registerMcpOAuthClient } from '@/lib/mcp/oauth/mcpOAuthService';
import { oauthErrorResponse, oauthJson, oauthOptions } from '@/lib/mcp/oauth/oauthHttp';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const client = await registerMcpOAuthClient(body);
    return oauthJson(client, 201);
  } catch (error) {
    return oauthErrorResponse(error);
  }
}

export function OPTIONS() {
  return oauthOptions();
}
