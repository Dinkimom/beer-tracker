import type { OrganizationRow } from '@/lib/organizations/types';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProductUserIdFromRequest } from '@/lib/auth/productSession';
import { findOrganizationMembership } from '@/lib/organizations/organizationMembersRepository';
import { findOrganizationById } from '@/lib/organizations/organizationRepository';
import { getOrganizationTrackerCredentials } from '@/lib/organizations/organizationTrackerCredentials';
import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';

import {
  resolveStoredOrganizationTrackerApiConfig,
  resolveTrackerApiConfigFromRequest,
  resolveTrackerCloudContextForProductOrganizationId,
  TrackerApiConfigError,
} from './trackerRequestConfig';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

vi.mock('@/lib/auth/productSession', () => ({
  getProductUserIdFromRequest: vi.fn(),
}));

vi.mock('@/lib/organizations/organizationMembersRepository', () => ({
  findOrganizationMembership: vi.fn(),
}));

vi.mock('@/lib/organizations/organizationRepository', () => ({
  fetchFirstOrganizationId: vi.fn(() => Promise.resolve('00000000-0000-4000-8000-000000000001')),
  findOrganizationById: vi.fn(),
}));

vi.mock('@/lib/onPrem/setupState', () => ({
  readOnPremSetupState: vi.fn(() => Promise.resolve({ hasAdmins: true, hasOrganizations: true, initialized: true })),
}));

vi.mock('@/lib/organizations/organizationTrackerCredentials', () => ({
  getOrganizationTrackerCredentials: vi.fn(),
}));

function storedToken(accessToken: string, atlassianOAuth = false) {
  return { accessToken, atlassianOAuth };
}

function organizationRow(overrides?: Partial<OrganizationRow>): OrganizationRow {
  return {
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    id: '00000000-0000-4000-8000-000000000001',
    initial_sync_completed_at: null,
    name: 'Org',
    settings: { issueTracker: { provider: 'tracker' } },
    slug: 'org',
    sync_next_run_at: null,
    tracker_org_id: 'cloud-org-1',
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('trackerRequestConfig provider context', () => {
  it('uses the organization tracker with the public Yandex API by default', async () => {
    vi.mocked(findOrganizationById).mockResolvedValueOnce(organizationRow());

    await expect(
      resolveTrackerCloudContextForProductOrganizationId(
        '00000000-0000-4000-8000-000000000001'
      )
    ).resolves.toEqual({
      apiUrl: 'https://api.tracker.yandex.net/v3',
      cloudId: '',
      orgId: 'cloud-org-1',
      providerKind: 'tracker',
      storedJiraEmail: '',
      webBaseUrl: 'https://tracker.yandex.ru',
    });
  });

  it('resolves Jira from the organization settings', async () => {
    vi.mocked(findOrganizationById).mockResolvedValueOnce(
      organizationRow({
        settings: {
          issueTracker: { apiUrl: 'https://jira.example.com/rest/api/2/', provider: 'jira-onprem' },
        },
        tracker_org_id: 'jira-site-1',
      })
    );

    await expect(
      resolveTrackerCloudContextForProductOrganizationId(
        '00000000-0000-4000-8000-000000000001'
      )
    ).resolves.toEqual({
      apiUrl: 'https://jira.example.com/rest/api/2',
      cloudId: '',
      orgId: 'jira-site-1',
      providerKind: 'jira-onprem',
      storedJiraEmail: '',
      webBaseUrl: 'https://jira.example.com',
    });
  });

  it('rejects organizations without a connected tracker', async () => {
    vi.mocked(findOrganizationById).mockResolvedValueOnce(organizationRow({ settings: {} }));

    await expect(
      resolveTrackerCloudContextForProductOrganizationId(
        '00000000-0000-4000-8000-000000000001'
      )
    ).rejects.toMatchObject({ status: 422 });
  });
});

describe('resolveTrackerApiConfigFromRequest', () => {
  const orgId = '00000000-0000-4000-8000-000000000001';
  const userId = '5430155e-d01e-11ea-fa98-fa163e1c52c6';

  function authedRequest(token?: string): Request {
    const headers = new Headers({ [TENANT_ORG_HEADER]: orgId });
    if (token) {
      headers.set('x-tracker-token', token);
    }
    return new Request('http://localhost/api/auth/myself', { headers });
  }

  beforeEach(() => {
    vi.mocked(getProductUserIdFromRequest).mockReturnValue(userId);
    vi.mocked(findOrganizationMembership).mockResolvedValue({
      created_at: new Date(),
      id: 'm1',
      organization_id: orgId,
      role: 'member',
      user_id: userId,
    });
    vi.mocked(findOrganizationById).mockResolvedValue(organizationRow());
    vi.mocked(getOrganizationTrackerCredentials).mockResolvedValue(null);
  });

  it('does not send empty OAuth: falls back to stored org token', async () => {
    vi.mocked(getOrganizationTrackerCredentials).mockResolvedValue(storedToken('stored-oauth'));
    const config = await resolveTrackerApiConfigFromRequest(authedRequest());
    expect(config.oauthToken).toBe('stored-oauth');
    expect(config.orgId).toBe('cloud-org-1');
  });

  it('throws TrackerApiConfigError 401 when session+org have no token', async () => {
    await expect(resolveTrackerApiConfigFromRequest(authedRequest())).rejects.toMatchObject({
      message: expect.stringContaining('Не найден токен Tracker'),
      status: 401,
    });
    await expect(resolveTrackerApiConfigFromRequest(authedRequest())).rejects.toBeInstanceOf(
      TrackerApiConfigError
    );
  });

  it('does not hand the stored org token to a request without a session', async () => {
    vi.mocked(getProductUserIdFromRequest).mockReturnValue(null);
    vi.mocked(getOrganizationTrackerCredentials).mockResolvedValue(storedToken('stored-oauth'));
    await expect(resolveTrackerApiConfigFromRequest(authedRequest())).rejects.toMatchObject({
      status: 401,
    });
    expect(getOrganizationTrackerCredentials).not.toHaveBeenCalled();
  });

  it('checks membership when a signed-in request has no org header', async () => {
    vi.mocked(findOrganizationMembership).mockResolvedValue(null);
    vi.mocked(getOrganizationTrackerCredentials).mockResolvedValue(storedToken('stored-oauth'));
    const request = new Request('http://localhost/api/issues/BT-1/transitions');
    await expect(resolveTrackerApiConfigFromRequest(request)).rejects.toMatchObject({ status: 403 });
  });

  it('accepts postgres uuid org header that fails zod .uuid()', async () => {
    const registryOrg = '5430155e-d01e-11ea-fa98-fa163e1c52c6';
    vi.mocked(findOrganizationMembership).mockResolvedValue({
      created_at: new Date(),
      id: 'm1',
      organization_id: registryOrg,
      role: 'member',
      user_id: userId,
    });
    vi.mocked(findOrganizationById).mockResolvedValue(
      organizationRow({ id: registryOrg })
    );
    const headers = new Headers({
      [TENANT_ORG_HEADER]: registryOrg,
      'x-tracker-token': 'y0_token',
    });
    const config = await resolveTrackerApiConfigFromRequest(
      new Request('http://localhost/api/auth/myself', { headers })
    );
    expect(config.oauthToken).toBe('y0_token');
    expect(findOrganizationMembership).toHaveBeenCalledWith(registryOrg, userId);
  });
});

describe('resolveStoredOrganizationTrackerApiConfig', () => {
  const orgId = '00000000-0000-4000-8000-000000000001';

  it('returns the stored organization token', async () => {
    vi.mocked(findOrganizationById).mockResolvedValueOnce(organizationRow());
    vi.mocked(getOrganizationTrackerCredentials).mockResolvedValueOnce(storedToken('stored-oauth'));

    await expect(resolveStoredOrganizationTrackerApiConfig(orgId)).resolves.toEqual({
      apiUrl: 'https://api.tracker.yandex.net/v3',
      cloudId: '',
      jiraEmail: '',
      oauthToken: 'stored-oauth',
      orgId: 'cloud-org-1',
      providerKind: 'tracker',
      storedJiraEmail: '',
      webBaseUrl: 'https://tracker.yandex.ru',
    });
  });

  it('throws 422 when the organization has no tracker token', async () => {
    vi.mocked(findOrganizationById).mockResolvedValueOnce(organizationRow());
    vi.mocked(getOrganizationTrackerCredentials).mockResolvedValueOnce(null);

    await expect(resolveStoredOrganizationTrackerApiConfig(orgId)).rejects.toMatchObject({
      status: 422,
    });
  });

  it('sends an org-stored Jira Cloud OAuth pair through the Atlassian gateway', async () => {
    vi.mocked(findOrganizationById).mockResolvedValueOnce(
      organizationRow({
        settings: {
          issueTracker: {
            apiUrl: 'https://acme.atlassian.net/rest/api/3',
            cloudId: 'cloud-1',
            provider: 'jira-cloud',
          },
        },
        tracker_org_id: 'jira',
      })
    );
    vi.mocked(getOrganizationTrackerCredentials).mockResolvedValueOnce(
      storedToken('oauth-access', true)
    );

    await expect(resolveStoredOrganizationTrackerApiConfig(orgId)).resolves.toMatchObject({
      apiUrl: 'https://api.atlassian.com/ex/jira/cloud-1/rest/api/3',
      cloudId: 'cloud-1',
      jiraEmail: '',
      oauthToken: 'oauth-access',
    });
  });

  it('still requires Basic email for an org-stored Jira Cloud API token', async () => {
    vi.mocked(findOrganizationById).mockResolvedValueOnce(
      organizationRow({
        settings: {
          issueTracker: {
            apiUrl: 'https://acme.atlassian.net/rest/api/3',
            cloudId: 'cloud-1',
            provider: 'jira-cloud',
          },
        },
        tracker_org_id: 'jira',
      })
    );
    vi.mocked(getOrganizationTrackerCredentials).mockResolvedValueOnce(storedToken('api-token'));

    await expect(resolveStoredOrganizationTrackerApiConfig(orgId)).rejects.toMatchObject({
      status: 400,
    });
  });
});
