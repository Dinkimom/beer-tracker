import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { NextRequest, NextResponse } from 'next/server';

import { createSprintContextMcpServer } from '@/lib/mcp/createSprintContextMcpServer';
import { MCP_OAUTH_CORS_HEADERS } from '@/lib/mcp/oauth/constants';
import {
  mcpUnauthorizedResponse,
  tryRequireSprintContextMcpAuth,
} from '@/lib/sprints/sprintContextAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(MCP_OAUTH_CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

async function handleMcp(request: NextRequest): Promise<Response> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ?? '';
  if (!token) {
    return mcpUnauthorizedResponse(request);
  }

  const auth = await tryRequireSprintContextMcpAuth(request);
  if (!auth || !('ctx' in auth)) {
    return auth && 'response' in auth ? auth.response : mcpUnauthorizedResponse(request);
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
    sessionIdGenerator: undefined,
  });
  const server = createSprintContextMcpServer({
    organizationId: auth.ctx.organizationId,
    profile: auth.profile,
    userId: auth.ctx.userId,
  });
  await server.connect(transport);
  return withCors(await transport.handleRequest(request));
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { headers: MCP_OAUTH_CORS_HEADERS, status: 204 });
}

export function GET(request: NextRequest): Promise<Response> {
  return handleMcp(request);
}

export function POST(request: NextRequest): Promise<Response> {
  return handleMcp(request);
}

export function DELETE(request: NextRequest): Promise<Response> {
  return handleMcp(request);
}
