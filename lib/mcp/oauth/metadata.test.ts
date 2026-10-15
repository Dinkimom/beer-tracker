import { describe, expect, it } from 'vitest';

import {
  buildAuthorizationServerMetadata,
  buildProtectedResourceMetadata,
  mcpProtectedResourceMetadataUrl,
  mcpResourceUrl,
  wwwAuthenticateHeader,
} from './metadata';

describe('mcp oauth metadata', () => {
  const origin = 'https://bt.example';

  it('builds protected resource metadata', () => {
    const doc = buildProtectedResourceMetadata(origin);
    expect(doc.resource).toBe('https://bt.example/api/mcp');
    expect(doc.authorization_servers).toEqual(['https://bt.example']);
    expect(doc.scopes_supported).toContain('mcp:tools');
  });

  it('builds authorization server metadata', () => {
    const doc = buildAuthorizationServerMetadata(origin);
    expect(doc.issuer).toBe('https://bt.example');
    expect(doc.authorization_endpoint).toBe('https://bt.example/api/oauth/authorize');
    expect(doc.token_endpoint).toBe('https://bt.example/api/oauth/token');
    expect(doc.registration_endpoint).toBe('https://bt.example/api/oauth/register');
    expect(doc.code_challenge_methods_supported).toEqual(['S256']);
  });

  it('builds path-aware PRM URL and WWW-Authenticate', () => {
    expect(mcpResourceUrl(origin)).toBe('https://bt.example/api/mcp');
    expect(mcpProtectedResourceMetadataUrl(origin)).toBe(
      'https://bt.example/.well-known/oauth-protected-resource/api/mcp'
    );
    expect(wwwAuthenticateHeader(origin)).toContain(
      'resource_metadata="https://bt.example/.well-known/oauth-protected-resource/api/mcp"'
    );
  });
});
