import { beforeEach, describe, expect, it, vi } from 'vitest';

import { enqueueInitialFullSync } from '@/lib/sync/queue';
import { isSyncRedisConfigured } from '@/lib/sync/redisConnection';
import { validateIssueTrackerCredentials } from '@/lib/trackerCredentialsValidation';

import { findOrganizationById } from './organizationRepository';
import {
  findOrganizationSecretRow,
  getDecryptedOrganizationTrackerSecretRaw,
  getDecryptedOrganizationTrackerToken,
} from './organizationSecretsRepository';
import { isOrganizationTrackerConnectionReady } from './organizationTrackerAdminFormState';
import {
  connectOrganizationTracker,
  getOrganizationTrackerAdminFormState,
  verifyStoredOrganizationTrackerToken,
} from './organizationTrackerConnection';

const ORG = '00000000-0000-4000-8000-000000000101';
const USER = '00000000-0000-4000-8000-000000000202';

const mockConnect = vi.fn();
const mockClientQuery = vi.fn();
const mockRelease = vi.fn();

vi.mock('./organizationRepository', () => ({
  findOrganizationById: vi.fn(),
}));

vi.mock('./organizationSecretsRepository', () => ({
  findOrganizationSecretRow: vi.fn(),
  getDecryptedOrganizationTrackerSecretRaw: vi.fn(),
  getDecryptedOrganizationTrackerToken: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  pool: { connect: (...args: unknown[]) => mockConnect(...args) },
  qualifyBeerTrackerTables: (sql: string) => sql,
}));

vi.mock('@/lib/crypto-org-secrets', () => ({
  encryptOrgTrackerToken: vi.fn(() => Buffer.from('mock-cipher')),
}));

vi.mock('@/lib/env', () => ({
  getOrgSecretsMasterKey: vi.fn(() => Buffer.alloc(32, 1)),
}));

vi.mock('@/lib/sync/queue', () => ({
  enqueueInitialFullSync: vi.fn(() => Promise.resolve({ id: 'job-1' } as never)),
}));

vi.mock('@/lib/sync/redisConnection', () => ({
  isSyncRedisConfigured: vi.fn(),
}));

vi.mock('@/lib/trackerCredentialsValidation', async (importOriginal) => {
  const mod = (await importOriginal()) as Record<string, unknown>;
  return {
    ...mod,
    validateIssueTrackerCredentials: vi.fn(),
  };
});

const YANDEX_API = 'https://api.tracker.yandex.net/v3';
const YANDEX_SETTINGS = { issueTracker: { apiUrl: YANDEX_API, provider: 'tracker' } };

function minimalOrg() {
  return {
    created_at: new Date(),
    id: ORG,
    initial_sync_completed_at: null,
    name: 'Test Org',
    settings: {},
    slug: 'test',
    sync_next_run_at: null,
    tracker_org_id: '',
    updated_at: new Date(),
  };
}

describe('connectOrganizationTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRelease.mockReset();
    mockClientQuery.mockReset();
    mockConnect.mockReset();
    mockConnect.mockResolvedValue({
      query: mockClientQuery,
      release: mockRelease,
    });
    mockClientQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce(undefined);
    vi.mocked(findOrganizationById).mockResolvedValue(minimalOrg());
    vi.mocked(getDecryptedOrganizationTrackerSecretRaw).mockResolvedValue(null);
    vi.mocked(getDecryptedOrganizationTrackerToken).mockResolvedValue(null);
    vi.mocked(validateIssueTrackerCredentials).mockResolvedValue({ ok: true });
    vi.mocked(isSyncRedisConfigured).mockReturnValue(true);
  });

  it('does not persist when Tracker OAuth validation fails', async () => {
    vi.mocked(validateIssueTrackerCredentials).mockResolvedValue({
      message: 'Недействительный токен',
      ok: false,
      status: 401,
    });

    const r = await connectOrganizationTracker({
      oauthToken: 'bad',
      organizationId: ORG,
      provider: 'tracker',
      trackerApiBaseUrl: YANDEX_API,
      trackerOrgId: 'cloud-1',
      userId: USER,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(401);
    }
    expect(mockConnect).not.toHaveBeenCalled();
    expect(enqueueInitialFullSync).not.toHaveBeenCalled();
  });

  it('persists connection and enqueues initial_full when Redis is configured', async () => {
    const r = await connectOrganizationTracker({
      oauthToken: 'oauth-secret-token',
      organizationId: ORG,
      provider: 'tracker',
      trackerApiBaseUrl: YANDEX_API,
      trackerOrgId: 'cloud-1',
      userId: USER,
    });

    expect(r).toEqual({
      ok: true,
      syncJobEnqueued: true,
      syncJobWarning: undefined,
    });
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockClientQuery).toHaveBeenCalled();
    expect(enqueueInitialFullSync).toHaveBeenCalledWith(ORG, USER);
  });

  it('stores a Jira sentinel instead of Cloud Org ID when the field is empty', async () => {
    const r = await connectOrganizationTracker({
      oauthToken: 'jira-pat',
      organizationId: ORG,
      provider: 'jira-onprem',
      trackerApiBaseUrl: 'https://jira.example.com/rest/api/2/',
      trackerOrgId: '',
      userId: USER,
    });

    expect(r.ok).toBe(true);
    expect(mockClientQuery.mock.calls.some((call) => call[1]?.[1] === 'jira')).toBe(true);
    const settingsWrite = mockClientQuery.mock.calls.find((call) => call[1]?.[1] === 'jira');
    expect(JSON.parse(String(settingsWrite?.[1]?.[2]))).toMatchObject({
      issueTracker: { apiUrl: 'https://jira.example.com/rest/api/2', provider: 'jira-onprem' },
    });
    expect(validateIssueTrackerCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ providerKind: 'jira-onprem' })
    );
  });

  it('asks to pick a tracker when neither the form nor the organization has one', async () => {
    const r = await connectOrganizationTracker({
      oauthToken: 'token',
      organizationId: ORG,
      trackerOrgId: 'cloud-1',
      userId: USER,
    });

    expect(r).toMatchObject({ ok: false, status: 400 });
    expect(validateIssueTrackerCredentials).not.toHaveBeenCalled();
  });

  it('refuses to switch the tracker after the first sync', async () => {
    vi.mocked(findOrganizationById).mockResolvedValue({
      ...minimalOrg(),
      initial_sync_completed_at: new Date(),
      settings: YANDEX_SETTINGS,
      tracker_org_id: 'cloud-1',
    });

    const r = await connectOrganizationTracker({
      oauthToken: 'jira-pat',
      organizationId: ORG,
      provider: 'jira-onprem',
      trackerApiBaseUrl: 'https://jira.example.com/rest/api/2',
      trackerOrgId: '',
      userId: USER,
    });

    expect(r).toMatchObject({ ok: false, status: 409 });
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('returns syncJobEnqueued false with warning when Redis is not configured', async () => {
    vi.mocked(isSyncRedisConfigured).mockReturnValue(false);

    const r = await connectOrganizationTracker({
      oauthToken: 'oauth-secret-token',
      organizationId: ORG,
      provider: 'tracker',
      trackerApiBaseUrl: YANDEX_API,
      trackerOrgId: 'cloud-1',
      userId: USER,
    });

    expect(r).toEqual({
      ok: true,
      syncJobEnqueued: false,
      syncJobWarning:
        'Redis не настроен (REDIS_URL); первичную синхронизацию нужно запустить вручную',
    });
    expect(enqueueInitialFullSync).not.toHaveBeenCalled();
  });

  it('returns unchanged without DB or Tracker when org/url match and token not re-sent', async () => {
    vi.mocked(findOrganizationById).mockResolvedValue({
      ...minimalOrg(),
      settings: YANDEX_SETTINGS,
      tracker_org_id: 'cloud-1',
    });

    const r = await connectOrganizationTracker({
      oauthToken: '',
      organizationId: ORG,
      trackerApiBaseUrl: YANDEX_API,
      trackerOrgId: 'cloud-1',
      userId: USER,
    });

    expect(r).toEqual({ ok: true, syncJobEnqueued: false, unchanged: true });
    expect(validateIssueTrackerCredentials).not.toHaveBeenCalled();
    expect(mockConnect).not.toHaveBeenCalled();
    expect(enqueueInitialFullSync).not.toHaveBeenCalled();
  });

  it('updates org/url using stored token when oauthToken is empty', async () => {
    vi.mocked(getDecryptedOrganizationTrackerSecretRaw).mockResolvedValue('stored-oauth-token');
    vi.mocked(getDecryptedOrganizationTrackerToken).mockResolvedValue('stored-oauth-token');
    vi.mocked(findOrganizationById).mockResolvedValue({
      ...minimalOrg(),
      tracker_org_id: 'old-cloud',
    });
    mockClientQuery
      .mockReset()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce(undefined);

    const r = await connectOrganizationTracker({
      oauthToken: '',
      organizationId: ORG,
      provider: 'tracker',
      trackerApiBaseUrl: YANDEX_API,
      trackerOrgId: 'cloud-1',
      userId: USER,
    });

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.unchanged).not.toBe(true);
      expect(r.syncJobEnqueued).toBe(true);
    }
    expect(validateIssueTrackerCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        oauthToken: 'stored-oauth-token',
        orgId: 'cloud-1',
      })
    );
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockClientQuery).toHaveBeenCalledTimes(3);
    expect(enqueueInitialFullSync).toHaveBeenCalledWith(ORG, USER);
  });

  it('fails when oauthToken empty and no stored token', async () => {
    const r = await connectOrganizationTracker({
      oauthToken: '',
      organizationId: ORG,
      provider: 'tracker',
      trackerApiBaseUrl: YANDEX_API,
      trackerOrgId: 'cloud-1',
      userId: USER,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
    }
    expect(mockConnect).not.toHaveBeenCalled();
  });
});

describe('verifyStoredOrganizationTrackerToken', () => {
  beforeEach(() => {
    vi.mocked(findOrganizationById).mockResolvedValue({
      ...minimalOrg(),
      settings: YANDEX_SETTINGS,
      tracker_org_id: 'cloud-verify',
    });
    vi.mocked(getDecryptedOrganizationTrackerToken).mockResolvedValue('decrypted-token');
    vi.mocked(validateIssueTrackerCredentials).mockResolvedValue({ ok: true });
  });

  it('returns ok when stored token validates against Tracker API', async () => {
    const r = await verifyStoredOrganizationTrackerToken(ORG);
    expect(r).toEqual({ ok: true });
    expect(validateIssueTrackerCredentials).toHaveBeenCalled();
  });

  it('uses site URL and Basic email when verifying a Jira Cloud org API token', async () => {
    vi.mocked(findOrganizationById).mockResolvedValue({
      ...minimalOrg(),
      settings: {
        issueTracker: {
          apiUrl: 'https://example.atlassian.net/rest/api/3',
          basicAuthEmail: 'ada@example.com',
          provider: 'jira-cloud',
        },
      },
      tracker_org_id: 'jira',
    });

    const r = await verifyStoredOrganizationTrackerToken(ORG);
    expect(r).toEqual({ ok: true });
    expect(validateIssueTrackerCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        apiUrl: 'https://example.atlassian.net/rest/api/3',
        email: 'ada@example.com',
        oauthToken: 'decrypted-token',
        providerKind: 'jira-cloud',
      })
    );
  });

  it('returns error when Cloud Org ID is not set', async () => {
    vi.mocked(findOrganizationById).mockResolvedValue({
      ...minimalOrg(),
      settings: YANDEX_SETTINGS,
      tracker_org_id: '',
    });
    const r = await verifyStoredOrganizationTrackerToken(ORG);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
    }
  });
});

describe('isOrganizationTrackerConnectionReady', () => {
  it('returns false for null/undefined', () => {
    expect(isOrganizationTrackerConnectionReady(null)).toBe(false);
    expect(isOrganizationTrackerConnectionReady(undefined)).toBe(false);
  });

  it('returns false without token or org id', () => {
    expect(
      isOrganizationTrackerConnectionReady({
        apiUrl: YANDEX_API,
        hasStoredToken: false,
        jiraEmail: '',
        organizationId: 'o1',
        provider: 'tracker',
        providerLocked: false,
        trackerOrgId: 'cloud',
      })
    ).toBe(false);
    expect(
      isOrganizationTrackerConnectionReady({
        apiUrl: YANDEX_API,
        hasStoredToken: true,
        jiraEmail: '',
        organizationId: 'o1',
        provider: 'tracker',
        providerLocked: false,
        trackerOrgId: '  ',
      })
    ).toBe(false);
  });

  it('returns false until a tracker is picked', () => {
    expect(
      isOrganizationTrackerConnectionReady({
        apiUrl: '',
        hasStoredToken: true,
        jiraEmail: '',
        organizationId: 'o1',
        provider: null,
        providerLocked: false,
        trackerOrgId: 'cloud-1',
      })
    ).toBe(false);
  });

  it('stays closed for Jira Cloud until the Atlassian account email is saved', () => {
    expect(
      isOrganizationTrackerConnectionReady({
        apiUrl: 'https://acme.atlassian.net/rest/api/3',
        hasStoredToken: true,
        jiraEmail: '',
        organizationId: 'o1',
        provider: 'jira-cloud',
        providerLocked: false,
        trackerOrgId: 'jira',
      })
    ).toBe(false);
    expect(
      isOrganizationTrackerConnectionReady({
        apiUrl: 'https://acme.atlassian.net/rest/api/3',
        hasStoredToken: true,
        jiraEmail: 'ada@example.com',
        organizationId: 'o1',
        provider: 'jira-cloud',
        providerLocked: false,
        trackerOrgId: 'jira',
      })
    ).toBe(true);
  });

  it('returns true when token and non-empty cloud org id', () => {
    expect(
      isOrganizationTrackerConnectionReady({
        apiUrl: YANDEX_API,
        hasStoredToken: true,
        jiraEmail: 'ada@example.com',
        organizationId: 'o1',
        provider: 'tracker',
        providerLocked: false,
        trackerOrgId: 'cloud-1',
      })
    ).toBe(true);
  });
});

describe('getOrganizationTrackerAdminFormState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports an organization without a tracker as not configured', async () => {
    vi.mocked(findOrganizationById).mockResolvedValue({ ...minimalOrg(), tracker_org_id: '' });
    vi.mocked(findOrganizationSecretRow).mockResolvedValue(null);

    await expect(getOrganizationTrackerAdminFormState(ORG)).resolves.toMatchObject({
      apiUrl: '',
      hasStoredToken: false,
      provider: null,
      providerLocked: false,
    });
  });

  it('returns the stored tracker and locks the type after the first sync', async () => {
    vi.mocked(findOrganizationById).mockResolvedValue({
      ...minimalOrg(),
      initial_sync_completed_at: new Date(),
      settings: {
        issueTracker: { apiUrl: 'https://jira.example.com/rest/api/2', provider: 'jira-onprem' },
      },
      tracker_org_id: 'jira',
    });
    vi.mocked(findOrganizationSecretRow).mockResolvedValue({
      encrypted_tracker_token: Buffer.from('cipher'),
    } as never);

    await expect(getOrganizationTrackerAdminFormState(ORG)).resolves.toMatchObject({
      apiUrl: 'https://jira.example.com/rest/api/2',
      hasStoredToken: true,
      provider: 'jira-onprem',
      providerLocked: true,
    });
  });

  it('keeps the type editable before the first sync', async () => {
    vi.mocked(findOrganizationById).mockResolvedValue({
      ...minimalOrg(),
      settings: YANDEX_SETTINGS,
      tracker_org_id: 'cloud-1',
    });
    vi.mocked(findOrganizationSecretRow).mockResolvedValue(null);

    await expect(getOrganizationTrackerAdminFormState(ORG)).resolves.toMatchObject({
      apiUrl: YANDEX_API,
      provider: 'tracker',
      providerLocked: false,
    });
  });
});
