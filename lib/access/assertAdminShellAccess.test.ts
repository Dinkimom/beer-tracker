import { beforeEach, describe, expect, it, vi } from 'vitest';

const forbiddenMock = vi.hoisted(() => vi.fn(() => {
  throw new Error('FORBIDDEN');
}));

vi.mock('next/navigation', () => ({
  forbidden: forbiddenMock,
}));

import {
  assertAdminShellAccessOrForbidden,
  hasAdminShellAccess,
} from './assertAdminShellAccess';

describe('hasAdminShellAccess', () => {
  it('is true when any org has canAccessAdmin', () => {
    expect(
      hasAdminShellAccess([
        {
          canAccessAdmin: false,
          canUsePlanner: true,
          initial_sync_completed_at: null,
          managedTeamIds: [],
          name: 'A',
          organization_id: 'o1',
          role: 'member',
          slug: null,
        },
        {
          canAccessAdmin: true,
          canUsePlanner: true,
          initial_sync_completed_at: null,
          managedTeamIds: null,
          name: 'B',
          organization_id: 'o2',
          role: 'org_admin',
          slug: null,
        },
      ])
    ).toBe(true);
  });

  it('is false when no org has canAccessAdmin', () => {
    expect(
      hasAdminShellAccess([
        {
          canAccessAdmin: false,
          canUsePlanner: true,
          initial_sync_completed_at: null,
          managedTeamIds: [],
          name: 'A',
          organization_id: 'o1',
          role: 'member',
          slug: null,
        },
      ])
    ).toBe(false);
  });
});

describe('assertAdminShellAccessOrForbidden', () => {
  beforeEach(() => {
    forbiddenMock.mockClear();
  });

  it('allows empty organization list (onboarding)', () => {
    expect(() => assertAdminShellAccessOrForbidden([])).not.toThrow();
    expect(forbiddenMock).not.toHaveBeenCalled();
  });

  it('calls forbidden when user has orgs but no admin access', () => {
    expect(() =>
      assertAdminShellAccessOrForbidden([
        {
          canAccessAdmin: false,
          canUsePlanner: true,
          initial_sync_completed_at: null,
          managedTeamIds: [],
          name: 'A',
          organization_id: 'o1',
          role: 'member',
          slug: null,
        },
      ])
    ).toThrow('FORBIDDEN');
    expect(forbiddenMock).toHaveBeenCalledOnce();
  });
});
