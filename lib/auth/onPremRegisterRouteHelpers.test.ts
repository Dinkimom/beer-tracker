import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerOnPremFirstUser } from '@/lib/auth/onPremRegisterRepository';
import { fetchOnPremRegisterTrackerIdentity } from '@/lib/onPrem/onPremRegisterTrackerIdentity';
import { encryptTrackerTokenOrError } from '@/lib/organizations/organizationTrackerConnectionHelpers';
import { TrackerApiConfigError } from '@/lib/trackerRequestConfig';

import { registerOnPremFirstUserFromTrackerToken } from './onPremRegisterRouteHelpers';

vi.mock('@/lib/db', () => ({
  pool: { connect: vi.fn() },
  query: vi.fn(),
  qualifyBeerTrackerTables: (sql: string) => sql,
}));

vi.mock('@/lib/auth/onPremRegisterRepository', () => ({
  registerOnPremFirstUser: vi.fn(),
}));

vi.mock('@/lib/onPrem/onPremRegisterTrackerIdentity', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchOnPremRegisterTrackerIdentity: vi.fn(),
}));

vi.mock('@/lib/organizations/organizationTrackerConnectionHelpers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  encryptTrackerTokenOrError: vi.fn(),
}));

const IDENTITY = { displayName: 'Ada', email: 'ada@example.com', trackerUserId: 'u-1' };
const CIPHER = Buffer.from('cipher');

function registerInput(
  overrides: Partial<Parameters<typeof registerOnPremFirstUserFromTrackerToken>[0]>
) {
  return registerOnPremFirstUserFromTrackerToken({
    orgName: 'Acme',
    provider: 'tracker',
    token: 'token',
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchOnPremRegisterTrackerIdentity).mockResolvedValue(IDENTITY);
  vi.mocked(encryptTrackerTokenOrError).mockReturnValue({ encrypted: CIPHER, ok: true });
  vi.mocked(registerOnPremFirstUser).mockResolvedValue(NextResponse.json({ ok: true }));
});

describe('registerOnPremFirstUserFromTrackerToken', () => {
  it('creates a Yandex Tracker organization with the public API', async () => {
    const res = await registerInput({ trackerOrgId: ' cloud-1 ' });

    expect(res.status).toBe(200);
    const tracker = { apiUrl: 'https://api.tracker.yandex.net/v3', kind: 'tracker' };
    expect(fetchOnPremRegisterTrackerIdentity).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'token', tracker, trackerOrgId: 'cloud-1' })
    );
    expect(registerOnPremFirstUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ada@example.com',
        encryptedTrackerToken: CIPHER,
        orgName: 'Acme',
        tracker,
        trackerOrgId: 'cloud-1',
      })
    );
  });

  it('requires a Cloud Organization ID for Yandex Tracker', async () => {
    const res = await registerInput({ trackerOrgId: '' });

    expect(res.status).toBe(400);
    expect(fetchOnPremRegisterTrackerIdentity).not.toHaveBeenCalled();
    expect(registerOnPremFirstUser).not.toHaveBeenCalled();
  });

  it('stores the normalized Jira Data Center URL', async () => {
    await registerInput({
      provider: 'jira-onprem',
      trackerApiBaseUrl: 'https://jira.example.com/rest/api/2/',
    });

    expect(registerOnPremFirstUser).toHaveBeenCalledWith(
      expect.objectContaining({
        tracker: { apiUrl: 'https://jira.example.com/rest/api/2', kind: 'jira-onprem' },
      })
    );
  });

  it('rejects Jira without a URL before calling the tracker', async () => {
    const res = await registerInput({ provider: 'jira-onprem', trackerApiBaseUrl: '' });

    expect(res.status).toBe(400);
    expect(fetchOnPremRegisterTrackerIdentity).not.toHaveBeenCalled();
  });

  it('rejects an empty token', async () => {
    const res = await registerInput({ token: '   ' });

    expect(res.status).toBe(400);
    expect(fetchOnPremRegisterTrackerIdentity).not.toHaveBeenCalled();
  });

  it('requires the Atlassian cloudId for Jira Cloud', async () => {
    const res = await registerInput({
      provider: 'jira-cloud',
      trackerApiBaseUrl: 'https://acme.atlassian.net/rest/api/3',
    });

    expect(res.status).toBe(400);
    expect(fetchOnPremRegisterTrackerIdentity).not.toHaveBeenCalled();
  });

  it('stores the Jira Cloud OAuth refresh token together with the access token', async () => {
    await registerInput({
      cloudId: 'cloud-9',
      expiresAt: 1_000,
      provider: 'jira-cloud',
      refreshToken: 'refresh',
      trackerApiBaseUrl: 'https://acme.atlassian.net/rest/api/3',
    });

    const secret = JSON.parse(String(vi.mocked(encryptTrackerTokenOrError).mock.calls[0]?.[0]));
    expect(secret).toMatchObject({ accessToken: 'token', expiresAt: 1_000, refreshToken: 'refresh' });
    expect(registerOnPremFirstUser).toHaveBeenCalledWith(
      expect.objectContaining({
        cloudId: 'cloud-9',
        tracker: { apiUrl: 'https://acme.atlassian.net/rest/api/3', kind: 'jira-cloud' },
      })
    );
  });

  it('passes tracker auth errors through with their status', async () => {
    vi.mocked(fetchOnPremRegisterTrackerIdentity).mockRejectedValue(
      new TrackerApiConfigError('Токен отклонён', 401)
    );

    const res = await registerInput({ trackerOrgId: 'cloud-1' });

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: 'Токен отклонён' });
    expect(registerOnPremFirstUser).not.toHaveBeenCalled();
  });
});
