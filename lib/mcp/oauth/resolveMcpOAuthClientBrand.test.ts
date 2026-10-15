import { describe, expect, it } from 'vitest';

import { resolveMcpOAuthClientBrand } from './resolveMcpOAuthClientBrand';

describe('resolveMcpOAuthClientBrand', () => {
  it('detects Cursor', () => {
    expect(resolveMcpOAuthClientBrand({ clientName: 'Cursor' })).toBe('cursor');
    expect(resolveMcpOAuthClientBrand({ clientUri: 'https://cursor.com' })).toBe('cursor');
  });

  it('detects Claude / Anthropic', () => {
    expect(resolveMcpOAuthClientBrand({ clientName: 'Claude Desktop' })).toBe('claude');
    expect(resolveMcpOAuthClientBrand({ clientName: 'Anthropic MCP' })).toBe('claude');
  });

  it('detects OpenAI / ChatGPT', () => {
    expect(resolveMcpOAuthClientBrand({ clientName: 'ChatGPT' })).toBe('openai');
    expect(resolveMcpOAuthClientBrand({ clientName: 'OpenAI Codex' })).toBe('openai');
  });

  it('falls back to generic', () => {
    expect(resolveMcpOAuthClientBrand({ clientName: 'My Agent' })).toBe('generic');
    expect(resolveMcpOAuthClientBrand({})).toBe('generic');
  });
});
