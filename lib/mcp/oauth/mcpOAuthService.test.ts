import { createHash } from 'crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/organizations/organizationRepository', () => ({
  listAllOrganizationsAdminSummaries: vi.fn(),
}));

vi.mock('@/lib/access/orgAccess', () => ({
  resolveAccessProfile: vi.fn(),
}));

vi.mock('./mcpOAuthRepository', () => ({
  consumeMcpOAuthCode: vi.fn(),
  findMcpOAuthClient: vi.fn(),
  findMcpOAuthCodeChallenge: vi.fn(),
  findValidMcpOAuthToken: vi.fn(),
  insertMcpOAuthClient: vi.fn(),
  insertMcpOAuthCode: vi.fn(),
  insertMcpOAuthToken: vi.fn(),
  revokeMcpOAuthToken: vi.fn(),
}));

import { resolveAccessProfile } from '@/lib/access/orgAccess';
import { listAllOrganizationsAdminSummaries } from '@/lib/organizations/organizationRepository';

import {
  consumeMcpOAuthCode,
  findMcpOAuthClient,
  findMcpOAuthCodeChallenge,
  findValidMcpOAuthToken,
  insertMcpOAuthClient,
  insertMcpOAuthToken,
} from './mcpOAuthRepository';
import {
  exchangeAuthorizationCode,
  registerMcpOAuthClient,
  resolveMcpOAuthSubject,
  verifyMcpAccessToken,
} from './mcpOAuthService';

describe('registerMcpOAuthClient', () => {
  beforeEach(() => {
    vi.mocked(insertMcpOAuthClient).mockReset();
  });

  it('registers a public client', async () => {
    vi.mocked(insertMcpOAuthClient).mockImplementation((input) =>
      Promise.resolve({
        clientId: input.clientId,
        clientIdIssuedAt: input.clientIdIssuedAt,
        clientSecret: input.clientSecret ?? null,
        clientSecretExpiresAt: input.clientSecretExpiresAt ?? null,
        metadata: input.metadata,
        redirectUris: input.redirectUris,
      })
    );

    const client = await registerMcpOAuthClient({
      client_name: 'Cursor',
      redirect_uris: ['http://127.0.0.1:8080/callback'],
      token_endpoint_auth_method: 'none',
    });

    expect(client.client_id).toBeTruthy();
    expect(client.redirect_uris).toEqual(['http://127.0.0.1:8080/callback']);
    expect(client.client_secret).toBeUndefined();
    expect(insertMcpOAuthClient).toHaveBeenCalledOnce();
  });

  it('rejects missing redirect_uris', async () => {
    await expect(registerMcpOAuthClient({})).rejects.toMatchObject({
      error: 'invalid_client_metadata',
    });
  });
});

describe('exchangeAuthorizationCode', () => {
  const verifier = 'test-verifier-abcdefghijklmnopqrstuvwxyz012345';
  const challenge = createHash('sha256').update(verifier, 'utf8').digest('base64url');

  beforeEach(() => {
    vi.mocked(findMcpOAuthClient).mockReset();
    vi.mocked(findMcpOAuthCodeChallenge).mockReset();
    vi.mocked(consumeMcpOAuthCode).mockReset();
    vi.mocked(insertMcpOAuthToken).mockReset();
  });

  it('exchanges a valid code with PKCE', async () => {
    vi.mocked(findMcpOAuthClient).mockResolvedValue({
      clientId: 'c1',
      clientIdIssuedAt: 1,
      clientSecret: null,
      clientSecretExpiresAt: null,
      metadata: {},
      redirectUris: ['http://127.0.0.1/cb'],
    });
    vi.mocked(findMcpOAuthCodeChallenge).mockResolvedValue(challenge);
    vi.mocked(consumeMcpOAuthCode).mockResolvedValue({
      clientId: 'c1',
      codeChallenge: challenge,
      organizationId: '11111111-1111-1111-1111-111111111111',
      redirectUri: 'http://127.0.0.1/cb',
      resource: 'https://bt.example/api/mcp',
      scopes: ['mcp:tools'],
      userId: 'u1',
    });
    vi.mocked(insertMcpOAuthToken).mockResolvedValue();

    const tokens = await exchangeAuthorizationCode({
      clientId: 'c1',
      clientSecret: null,
      code: 'auth-code',
      codeVerifier: verifier,
      origin: 'https://bt.example',
      redirectUri: 'http://127.0.0.1/cb',
    });

    expect(tokens.token_type).toBe('Bearer');
    expect(tokens.access_token).toBeTruthy();
    expect(tokens.refresh_token).toBeTruthy();
    expect(insertMcpOAuthToken).toHaveBeenCalledTimes(2);
  });

  it('rejects bad code_verifier', async () => {
    vi.mocked(findMcpOAuthClient).mockResolvedValue({
      clientId: 'c1',
      clientIdIssuedAt: 1,
      clientSecret: null,
      clientSecretExpiresAt: null,
      metadata: {},
      redirectUris: ['http://127.0.0.1/cb'],
    });
    vi.mocked(findMcpOAuthCodeChallenge).mockResolvedValue(challenge);

    await expect(
      exchangeAuthorizationCode({
        clientId: 'c1',
        clientSecret: null,
        code: 'auth-code',
        codeVerifier: 'wrong-verifier-abcdefghijklmnopqrstuvwxyz',
        origin: 'https://bt.example',
      })
    ).rejects.toMatchObject({ error: 'invalid_grant' });
  });
});

describe('verifyMcpAccessToken', () => {
  beforeEach(() => {
    vi.mocked(findValidMcpOAuthToken).mockReset();
  });

  it('returns null without mcp:tools scope', async () => {
    vi.mocked(findValidMcpOAuthToken).mockResolvedValue({
      clientId: 'c1',
      expiresAt: new Date(Date.now() + 60_000),
      organizationId: '11111111-1111-1111-1111-111111111111',
      resource: null,
      revokedAt: null,
      scopes: ['other'],
      tokenType: 'access',
      userId: 'u1',
    });
    await expect(verifyMcpAccessToken('tok')).resolves.toBeNull();
  });
});

describe('resolveMcpOAuthSubject', () => {
  beforeEach(() => {
    vi.mocked(listAllOrganizationsAdminSummaries).mockReset();
    vi.mocked(resolveAccessProfile).mockReset();
  });

  it('uses membership role when present', async () => {
    vi.mocked(listAllOrganizationsAdminSummaries).mockResolvedValue([
      {
        initial_sync_completed_at: null,
        issueTracker: null,
        organization_id: '11111111-1111-1111-1111-111111111111',
        name: 'Org',
        role: 'member',
        slug: null,
      },
    ]);
    vi.mocked(resolveAccessProfile).mockResolvedValue({
      organizationId: '11111111-1111-1111-1111-111111111111',
      orgRole: 'member',
      teamMemberships: [],
      userId: 'u1',
    });
    await expect(resolveMcpOAuthSubject('u1')).resolves.toEqual({
      organizationId: '11111111-1111-1111-1111-111111111111',
      role: 'member',
    });
  });
});
