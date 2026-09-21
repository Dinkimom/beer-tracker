import type { OrganizationRow } from '@/lib/organizations/types';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProductUserIdFromRequest } from '@/lib/auth/productSession';
import { getIssueTrackerProviderKind } from '@/lib/env';
import { findOrganizationMembership } from '@/lib/organizations/organizationMembersRepository';
import { findOrganizationById } from '@/lib/organizations/organizationRepository';
import { getDecryptedOrganizationTrackerToken } from '@/lib/organizations/organizationSecretsRepository';
import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';

import {
  resolveStoredOrganizationTrackerApiConfig,
  resolveTrackerApiConfigFromRequest,
  resolveTrackerCloudContextForProductOrganizationId,
  TrackerApiConfigError,
} from './trackerRequestConfig';

vi.mock('@/lib/env', () => ({
  getTrackerConfig: () => ({
    apiUrl: 'https://api.tracker.yandex.net/v3',
    oauthToken: '',
    orgId: '',
  }),
  getIssueTrackerProviderKind: vi.fn(() => 'tracker'),
}));

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
  findOrganizationById: vi.fn(),
}));

vi.mock('@/lib/organizations/organizationSecretsRepository', () => ({
  getDecryptedOrganizationTrackerToken: vi.fn(),
}));

function organizationRow(overrides?: Partial<OrganizationRow>): OrganizationRow {
  return {
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    id: '00000000-0000-4000-8000-000000000001',
    initial_sync_completed_at: null,
    name: 'Org',
    settings: {},
    slug: 'org',
    sync_next_run_at: null,
    tracker_org_id: 'cloud-org-1',
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getIssueTrackerProviderKind).mockReturnValue('tracker');
});

describe('trackerRequestConfig provider context', () => {
  it('uses instance ISSUE_TRACKER_PROVIDER (defaults to Yandex Tracker)', async () => {
    vi.mocked(findOrganizationById).mockResolvedValueOnce(organizationRow());

    await expect(
      resolveTrackerCloudContextForProductOrganizationId(
        '00000000-0000-4000-8000-000000000001'
      )
    ).resolves.toEqual({
      apiUrl: 'https://api.tracker.yandex.net/v3',
      orgId: 'cloud-org-1',
      providerKind: 'tracker',
      storedJiraEmail: '',
    });
  });

  it('resolves Jira provider from ISSUE_TRACKER_PROVIDER for skeleton adapter', async () => {
    vi.mocked(getIssueTrackerProviderKind).mockReturnValue('jira-onprem');
    vi.mocked(findOrganizationById).mockResolvedValueOnce(
      organizationRow({
        tracker_org_id: 'jira-site-1',
      })
    );

    await expect(
      resolveTrackerCloudContextForProductOrganizationId(
        '00000000-0000-4000-8000-000000000001'
      )
    ).resolves.toEqual({
      apiUrl: 'https://api.tracker.yandex.net/v3',
      orgId: 'jira-site-1',
      providerKind: 'jira-onprem',
      storedJiraEmail: '',
    });
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
    vi.mocked(getDecryptedOrganizationTrackerToken).mockResolvedValue(null);
  });

  it('does not send empty OAuth: falls back to stored org token', async () => {
    vi.mocked(getDecryptedOrganizationTrackerToken).mockResolvedValue('stored-oauth');
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
    vi.mocked(getDecryptedOrganizationTrackerToken).mockResolvedValueOnce('stored-oauth');

    await expect(resolveStoredOrganizationTrackerApiConfig(orgId)).resolves.toEqual({
      apiUrl: 'https://api.tracker.yandex.net/v3',
      jiraEmail: '',
      oauthToken: 'stored-oauth',
      orgId: 'cloud-org-1',
      providerKind: 'tracker',
      storedJiraEmail: '',
    });
  });

  it('throws 422 when the organization has no tracker token', async () => {
    vi.mocked(findOrganizationById).mockResolvedValueOnce(organizationRow());
    vi.mocked(getDecryptedOrganizationTrackerToken).mockResolvedValueOnce(null);

    await expect(resolveStoredOrganizationTrackerApiConfig(orgId)).rejects.toMatchObject({
      status: 422,
    });
  });
});
