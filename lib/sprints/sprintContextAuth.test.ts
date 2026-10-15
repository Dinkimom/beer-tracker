import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readSprintContextMcpToken, tryRequireSprintContextMcpAuth } from './sprintContextAuth';

vi.mock('@/lib/mcp/oauth/mcpOAuthService', () => ({
  verifyMcpAccessToken: vi.fn(),
}));

vi.mock('@/lib/access/orgAccess', () => ({
  resolveAccessProfile: vi.fn(),
}));

import { resolveAccessProfile } from '@/lib/access/orgAccess';
import { verifyMcpAccessToken } from '@/lib/mcp/oauth/mcpOAuthService';

describe('readSprintContextMcpToken', () => {
  it('reads Bearer token', () => {
    const request = new Request('http://localhost/api', {
      headers: { authorization: 'Bearer access-token' },
    });
    expect(readSprintContextMcpToken(request)).toBe('access-token');
  });

  it('returns empty string when Authorization is absent', () => {
    expect(readSprintContextMcpToken(new Request('http://localhost/api'))).toBe('');
  });
});

describe('tryRequireSprintContextMcpAuth', () => {
  beforeEach(() => {
    vi.mocked(verifyMcpAccessToken).mockReset();
    vi.mocked(resolveAccessProfile).mockReset();
  });

  it('returns null without Bearer', async () => {
    await expect(
      tryRequireSprintContextMcpAuth(new Request('http://localhost/api/mcp'))
    ).resolves.toBeNull();
    expect(verifyMcpAccessToken).not.toHaveBeenCalled();
  });

  it('returns 401 for invalid Bearer', async () => {
    vi.mocked(verifyMcpAccessToken).mockResolvedValue(null);
    const result = await tryRequireSprintContextMcpAuth(
      new Request('http://localhost/api/mcp', {
        headers: { authorization: 'Bearer bad' },
      })
    );
    expect(result && 'response' in result).toBe(true);
    if (result && 'response' in result) {
      expect(result.response.status).toBe(401);
      expect(result.response.headers.get('WWW-Authenticate')).toContain('resource_metadata=');
    }
  });

  it('builds tenant from verified token + access profile', async () => {
    vi.mocked(verifyMcpAccessToken).mockResolvedValue({
      clientId: 'client-1',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      organizationId: '11111111-1111-1111-1111-111111111111',
      resource: 'http://localhost/api/mcp',
      scopes: ['mcp:tools'],
      userId: 'user-1',
    });
    vi.mocked(resolveAccessProfile).mockResolvedValue({
      organizationId: '11111111-1111-1111-1111-111111111111',
      orgRole: 'member',
      teamMemberships: [],
      userId: 'user-1',
    });

    const result = await tryRequireSprintContextMcpAuth(
      new Request('http://localhost/api/mcp', {
        headers: { authorization: 'Bearer good' },
      })
    );
    expect(result && 'ctx' in result).toBe(true);
    if (result && 'ctx' in result) {
      expect(result.ctx.userId).toBe('user-1');
      expect(result.ctx.role).toBe('member');
      expect(result.profile.orgRole).toBe('member');
    }
  });

  it('returns 401 when token is valid but user has no org access', async () => {
    vi.mocked(verifyMcpAccessToken).mockResolvedValue({
      clientId: 'client-1',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      organizationId: '11111111-1111-1111-1111-111111111111',
      resource: 'http://localhost/api/mcp',
      scopes: ['mcp:tools'],
      userId: 'removed-user',
    });
    vi.mocked(resolveAccessProfile).mockResolvedValue(null);

    const result = await tryRequireSprintContextMcpAuth(
      new Request('http://localhost/api/mcp', {
        headers: { authorization: 'Bearer still-alive' },
      })
    );
    expect(result && 'response' in result).toBe(true);
    if (result && 'response' in result) {
      expect(result.response.status).toBe(401);
    }
  });
});
