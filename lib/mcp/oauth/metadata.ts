import { MCP_OAUTH_SCOPE, MCP_RESOURCE_PATH } from './constants';

export function mcpResourceUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}${MCP_RESOURCE_PATH}`;
}

/** RFC 9728 path-aware PRM URL for `/api/mcp`. */
export function mcpProtectedResourceMetadataUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}/.well-known/oauth-protected-resource${MCP_RESOURCE_PATH}`;
}

export function buildProtectedResourceMetadata(origin: string) {
  const issuer = origin.replace(/\/$/, '');
  return {
    authorization_servers: [issuer],
    bearer_methods_supported: ['header'],
    resource: mcpResourceUrl(issuer),
    resource_name: 'Beer Tracker sprint planning MCP',
    scopes_supported: [MCP_OAUTH_SCOPE],
  };
}

export function buildAuthorizationServerMetadata(origin: string) {
  const issuer = origin.replace(/\/$/, '');
  return {
    authorization_endpoint: `${issuer}/api/oauth/authorize`,
    code_challenge_methods_supported: ['S256'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    issuer,
    registration_endpoint: `${issuer}/api/oauth/register`,
    response_types_supported: ['code'],
    revocation_endpoint: `${issuer}/api/oauth/revoke`,
    revocation_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    scopes_supported: [MCP_OAUTH_SCOPE],
    token_endpoint: `${issuer}/api/oauth/token`,
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
  };
}

export function wwwAuthenticateHeader(origin: string): string {
  const metadataUrl = mcpProtectedResourceMetadataUrl(origin);
  return `Bearer realm="mcp", resource_metadata="${metadataUrl}"`;
}
