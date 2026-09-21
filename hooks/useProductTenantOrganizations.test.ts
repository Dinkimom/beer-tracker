import { describe, expect, it } from 'vitest';

import {
  normalizeProductSessionOrganizations,
  resolveActiveOrganizationId,
  resolveDisplayedActiveOrganizationId,
  shouldSyncStoredOrganizationFromSession,
} from './useProductTenantOrganizations';

describe('normalizeProductSessionOrganizations', () => {
  it('returns empty list when the payload has no organizations', () => {
    expect(normalizeProductSessionOrganizations(undefined)).toEqual([]);
    expect(normalizeProductSessionOrganizations([])).toEqual([]);
  });

  it('fills access flags and managedTeamIds defaults', () => {
    expect(
      normalizeProductSessionOrganizations([
        {
          id: 'org-a',
          name: 'A',
          role: 'org_admin',
          slug: 'a',
        },
        {
          id: 'org-b',
          name: 'B',
          role: 'member',
          slug: null,
        },
      ])
    ).toEqual([
      {
        canAccessAdmin: true,
        canUsePlanner: true,
        id: 'org-a',
        managedTeamIds: null,
        name: 'A',
        role: 'org_admin',
        slug: 'a',
      },
      {
        canAccessAdmin: false,
        canUsePlanner: true,
        id: 'org-b',
        managedTeamIds: [],
        name: 'B',
        role: 'member',
        slug: null,
      },
    ]);
  });

  it('does not treat catalog team_lead as organization admin', () => {
    expect(
      normalizeProductSessionOrganizations([
        {
          id: 'org-c',
          name: 'C',
          role: 'team_lead',
          slug: 'c',
        },
      ])
    ).toEqual([
      {
        canAccessAdmin: false,
        canUsePlanner: true,
        id: 'org-c',
        managedTeamIds: [],
        name: 'C',
        role: 'team_lead',
        slug: 'c',
      },
    ]);
  });
});

describe('resolveActiveOrganizationId', () => {
  const orgs = [
    {
      canAccessAdmin: true,
      canUsePlanner: true,
      id: 'org-a',
      managedTeamIds: null,
      name: 'A',
      role: 'org_admin' as const,
      slug: 'a',
    },
    {
      canAccessAdmin: false,
      canUsePlanner: true,
      id: 'org-b',
      managedTeamIds: [],
      name: 'B',
      role: 'member' as const,
      slug: 'b',
    },
  ];

  it('returns null when the session has no organizations', () => {
    expect(resolveActiveOrganizationId('org-a', [])).toBeNull();
  });

  it('keeps the stored id when it is still in the list', () => {
    expect(resolveActiveOrganizationId('org-b', orgs)).toBe('org-b');
  });

  it('falls back to the first organization when stored id is missing', () => {
    expect(resolveActiveOrganizationId('org-gone', orgs)).toBe('org-a');
    expect(resolveActiveOrganizationId(null, orgs)).toBe('org-a');
  });
});

describe('shouldSyncStoredOrganizationFromSession', () => {
  it('does not sync an anonymous empty session over a stored tenant', () => {
    expect(
      shouldSyncStoredOrganizationFromSession({ organizationCount: 0, signedIn: false })
    ).toBe(false);
  });

  it('syncs once the user is signed in or the session lists organizations', () => {
    expect(
      shouldSyncStoredOrganizationFromSession({ organizationCount: 0, signedIn: true })
    ).toBe(true);
    expect(
      shouldSyncStoredOrganizationFromSession({ organizationCount: 1, signedIn: false })
    ).toBe(true);
  });
});

describe('resolveDisplayedActiveOrganizationId', () => {
  it('keeps the stored tenant while the session is still anonymous', () => {
    expect(
      resolveDisplayedActiveOrganizationId({
        organizations: [],
        signedIn: false,
        storedId: 'org-a',
      })
    ).toBe('org-a');
  });
});
