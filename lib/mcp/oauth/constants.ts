/** Scope granted to MCP clients (read + write tools). */
export const MCP_OAUTH_SCOPE = 'mcp:tools';

export const MCP_OAUTH_ACCESS_TTL_SEC = 60 * 60;
export const MCP_OAUTH_REFRESH_TTL_SEC = 30 * 24 * 60 * 60;
export const MCP_OAUTH_CODE_TTL_SEC = 10 * 60;

export const MCP_RESOURCE_PATH = '/api/mcp';

export const MCP_OAUTH_CORS_HEADERS: HeadersInit = {
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, Accept, Mcp-Session-Id, Last-Event-ID, mcp-protocol-version',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, mcp-protocol-version, WWW-Authenticate',
};
