import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { NextRequest, NextResponse } from 'next/server';

import { isSprintContextMcpSecretConfigured } from '@/lib/env';
import { createSprintContextMcpServer } from '@/lib/mcp/createSprintContextMcpServer';
import { tryRequireSprintContextMcpAuth } from '@/lib/sprints/sprintContextAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MCP_CORS_HEADERS: HeadersInit = {
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, Accept, Mcp-Session-Id, Last-Event-ID, mcp-protocol-version, X-Sprint-Context-Secret',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, mcp-protocol-version',
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(MCP_CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function unauthorized(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized: set Authorization Bearer to SPRINT_CONTEXT_MCP_SECRET' },
    { headers: MCP_CORS_HEADERS, status: 401 }
  );
}

function mcpDisabled(): NextResponse {
  return NextResponse.json(
    { error: 'MCP disabled: set SPRINT_CONTEXT_MCP_SECRET on the instance' },
    { headers: MCP_CORS_HEADERS, status: 503 }
  );
}

async function handleMcp(request: NextRequest): Promise<Response> {
  if (!isSprintContextMcpSecretConfigured()) {
    return mcpDisabled();
  }

  const auth = await tryRequireSprintContextMcpAuth(request);
  if (!auth) {
    return unauthorized();
  }
  if (!('ctx' in auth)) {
    return auth.response;
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
    sessionIdGenerator: undefined,
  });
  const server = createSprintContextMcpServer({ organizationId: auth.ctx.organizationId });
  await server.connect(transport);
  return withCors(await transport.handleRequest(request));
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { headers: MCP_CORS_HEADERS, status: 204 });
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
