import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerOnPremFirstUser } from './onPremRegisterRepository';

const mockClientQuery = vi.fn();
const mockRelease = vi.fn();

vi.mock('@/lib/db', () => ({
  pool: { connect: () => Promise.resolve({ query: mockClientQuery, release: mockRelease }) },
  qualifyBeerTrackerTables: (sql: string) => sql,
}));

vi.mock('./adminsRepository', () => ({
  ensureAdminsTable: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/auth/orgSlug', () => ({
  allocateUniqueOrganizationSlug: vi.fn(() => Promise.resolve('acme')),
}));

vi.mock('./cookies', () => ({
  appendProductSessionCookie: vi.fn(),
}));

function databaseState(initialized: boolean) {
  mockClientQuery.mockImplementation((sql: string) => {
    if (sql.includes('has_organizations')) {
      return Promise.resolve({ rows: [{ has_admins: initialized, has_organizations: initialized }] });
    }
    if (sql.includes('INSERT INTO organizations')) {
      return Promise.resolve({ rows: [{ id: 'org-1' }] });
    }
    if (sql.includes('INSERT INTO staff')) {
      return Promise.resolve({ rows: [{ id: 'staff-1' }] });
    }
    return Promise.resolve({ rows: [] });
  });
}

function insertedOrganizationSettings(): Record<string, unknown> {
  const call = mockClientQuery.mock.calls.find(([sql]) =>
    String(sql).includes('INSERT INTO organizations')
  );
  return JSON.parse(String(call?.[1]?.[3])) as Record<string, unknown>;
}

const BASE_INPUT = {
  displayName: 'Ada',
  email: 'ada@example.com',
  encryptedTrackerToken: Buffer.from('cipher'),
  orgName: 'Acme',
  trackerUserId: 'u-1',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('registerOnPremFirstUser', () => {
  it('stores the chosen tracker in organization settings', async () => {
    databaseState(false);

    const res = await registerOnPremFirstUser({
      ...BASE_INPUT,
      cloudId: 'cloud-9',
      tracker: { apiUrl: 'https://acme.atlassian.net/rest/api/3', kind: 'jira-cloud' },
      trackerOrgId: 'jira',
    });

    expect(res.status).toBe(200);
    const settings = insertedOrganizationSettings();
    expect(settings.issueTracker).toEqual({
      apiUrl: 'https://acme.atlassian.net/rest/api/3',
      cloudId: 'cloud-9',
      provider: 'jira-cloud',
    });
    expect(settings).toHaveProperty('trackerIntegration');
    expect(mockClientQuery).toHaveBeenCalledWith('COMMIT');
    expect(mockRelease).toHaveBeenCalled();
  });

  it('answers 409 and rolls back when the instance is already initialized', async () => {
    databaseState(true);

    const res = await registerOnPremFirstUser({
      ...BASE_INPUT,
      tracker: { apiUrl: 'https://api.tracker.yandex.net/v3', kind: 'tracker' },
      trackerOrgId: 'cloud-1',
    });

    expect(res.status).toBe(409);
    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(
      mockClientQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO organizations'))
    ).toBe(false);
  });

  it('requires an email before touching the database', async () => {
    const res = await registerOnPremFirstUser({
      ...BASE_INPUT,
      email: '',
      tracker: { apiUrl: 'https://api.tracker.yandex.net/v3', kind: 'tracker' },
      trackerOrgId: 'cloud-1',
    });

    expect(res.status).toBe(422);
    expect(mockClientQuery).not.toHaveBeenCalled();
  });
});
