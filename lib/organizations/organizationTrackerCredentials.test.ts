import { beforeEach, describe, expect, it, vi } from 'vitest';

import { serializeOrgAtlassianOAuthSecret } from '@/lib/atlassianOAuth/orgSecretPayload';
import { refreshAtlassianAccessToken } from '@/lib/atlassianOAuth/tokenExchange';

import {
  getDecryptedOrganizationTrackerSecretRaw,
  updateOrganizationTrackerSecretLocked,
} from './organizationSecretsRepository';
import {
  getOrganizationTrackerCredentials,
  organizationTrackerClientAuth,
  refreshOrganizationSharedAtlassianGrant,
} from './organizationTrackerCredentials';

vi.mock('./organizationSecretsRepository', () => ({
  getDecryptedOrganizationTrackerSecretRaw: vi.fn(),
  updateOrganizationTrackerSecretLocked: vi.fn(),
}));

vi.mock('@/lib/atlassianOAuth/tokenExchange', () => ({
  refreshAtlassianAccessToken: vi.fn(),
}));

vi.mock('@/lib/atlassianOAuth/env', () => ({
  assertAtlassianOAuthConfigured: () => ({ clientId: 'cid', clientSecret: 'secret', ok: true }),
}));

const ORG = 'org-1';
const NOW = 1_800_000_000_000;

let storedRaw: string;

function oauthSecret(input: {
  accessToken: string;
  expiresAt: number;
  previousRefreshToken?: string;
  refreshToken: string;
}): string {
  return serializeOrgAtlassianOAuthSecret(input);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
  vi.mocked(getDecryptedOrganizationTrackerSecretRaw).mockImplementation(() => Promise.resolve(storedRaw));
  vi.mocked(updateOrganizationTrackerSecretLocked).mockImplementation(async (_orgId, update) => {
    const { next, result } = await update(storedRaw);
    if (next != null) {
      storedRaw = next;
    }
    return result;
  });
  vi.mocked(refreshAtlassianAccessToken).mockResolvedValue({
    accessToken: 'access-2',
    expiresIn: 3600,
    refreshToken: 'refresh-2',
  });
});

describe('getOrganizationTrackerCredentials', () => {
  it('returns a bare API token as non-OAuth', async () => {
    storedRaw = 'api-token';
    await expect(getOrganizationTrackerCredentials(ORG)).resolves.toEqual({
      accessToken: 'api-token',
      atlassianOAuth: false,
    });
  });

  it('uses a fresh OAuth access token without refreshing', async () => {
    storedRaw = oauthSecret({ accessToken: 'access-1', expiresAt: NOW + 600_000, refreshToken: 'refresh-1' });
    await expect(getOrganizationTrackerCredentials(ORG)).resolves.toEqual({
      accessToken: 'access-1',
      atlassianOAuth: true,
    });
    expect(refreshAtlassianAccessToken).not.toHaveBeenCalled();
  });

  it('rotates an expired pair and stores the previous refresh token', async () => {
    storedRaw = oauthSecret({ accessToken: 'access-1', expiresAt: NOW - 1, refreshToken: 'refresh-1' });

    await expect(getOrganizationTrackerCredentials(ORG)).resolves.toEqual({
      accessToken: 'access-2',
      atlassianOAuth: true,
    });
    expect(refreshAtlassianAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({ refreshToken: 'refresh-1' })
    );
    expect(JSON.parse(storedRaw)).toMatchObject({
      accessToken: 'access-2',
      expiresAt: NOW + 3_600_000,
      previousRefreshToken: 'refresh-1',
      refreshToken: 'refresh-2',
    });
  });

  it('falls back to the stale access token when Atlassian refuses the refresh', async () => {
    storedRaw = oauthSecret({ accessToken: 'access-1', expiresAt: NOW - 1, refreshToken: 'refresh-1' });
    vi.mocked(refreshAtlassianAccessToken).mockRejectedValueOnce(new Error('invalid_grant'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(getOrganizationTrackerCredentials(ORG)).resolves.toEqual({
      accessToken: 'access-1',
      atlassianOAuth: true,
    });
  });
});

describe('refreshOrganizationSharedAtlassianGrant', () => {
  it('ignores refresh tokens from other grants', async () => {
    storedRaw = oauthSecret({ accessToken: 'access-1', expiresAt: NOW + 600_000, refreshToken: 'refresh-1' });
    await expect(refreshOrganizationSharedAtlassianGrant(ORG, 'foreign')).resolves.toBeNull();
    expect(updateOrganizationTrackerSecretLocked).not.toHaveBeenCalled();
  });

  it('rotates when the browser holds the current refresh token', async () => {
    storedRaw = oauthSecret({ accessToken: 'access-1', expiresAt: NOW + 600_000, refreshToken: 'refresh-1' });
    await expect(refreshOrganizationSharedAtlassianGrant(ORG, 'refresh-1')).resolves.toMatchObject({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
    });
  });

  it('hands the already rotated pair to a browser with the previous refresh token', async () => {
    storedRaw = oauthSecret({
      accessToken: 'access-2',
      expiresAt: NOW + 600_000,
      previousRefreshToken: 'refresh-1',
      refreshToken: 'refresh-2',
    });
    await expect(refreshOrganizationSharedAtlassianGrant(ORG, 'refresh-1')).resolves.toMatchObject({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
    });
    expect(refreshAtlassianAccessToken).not.toHaveBeenCalled();
  });
});

describe('organizationTrackerClientAuth', () => {
  const base = { apiUrl: 'https://acme.atlassian.net/rest/api/3', jiraEmail: 'a@b.c' };

  it('routes an OAuth pair through the cloudId gateway', () => {
    expect(
      organizationTrackerClientAuth({
        ...base,
        cloudId: 'cloud-1',
        credentials: { accessToken: 't', atlassianOAuth: true },
      })
    ).toEqual({ apiUrl: 'https://api.atlassian.com/ex/jira/cloud-1/rest/api/3', jiraEmail: '' });
  });

  it('keeps the site URL and Basic email for an API token', () => {
    expect(
      organizationTrackerClientAuth({
        ...base,
        cloudId: 'cloud-1',
        credentials: { accessToken: 't', atlassianOAuth: false },
      })
    ).toEqual(base);
  });
});
