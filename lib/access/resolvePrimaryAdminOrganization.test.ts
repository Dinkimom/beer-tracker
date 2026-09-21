import { describe, expect, it } from 'vitest';

import {
  resolvePrimaryAdminOrganization,
  resolvePrimaryAdminOrganizationId,
} from './resolvePrimaryAdminOrganization';

describe('resolvePrimaryAdminOrganization', () => {
  it('prefers an org the user can administer', () => {
    const admin = {
      canAccessAdmin: true,
      organization_id: 'admin-org',
      name: 'Admin',
      role: 'org_admin' as const,
      slug: null,
      initial_sync_completed_at: null,
    };
    const member = {
      canAccessAdmin: false,
      organization_id: 'member-org',
      name: 'Member',
      role: 'member' as const,
      slug: null,
      initial_sync_completed_at: null,
    };
    expect(resolvePrimaryAdminOrganization([member, admin])).toEqual(admin);
  });

  it('falls back to the first membership when none is admin', () => {
    const member = {
      canAccessAdmin: false,
      organization_id: 'member-org',
      name: 'Member',
      role: 'member' as const,
      slug: null,
      initial_sync_completed_at: null,
    };
    expect(resolvePrimaryAdminOrganization([member])).toEqual(member);
    expect(resolvePrimaryAdminOrganizationId([member])).toBe('member-org');
  });

  it('returns null for an empty list', () => {
    expect(resolvePrimaryAdminOrganization([])).toBeNull();
    expect(resolvePrimaryAdminOrganizationId([])).toBe('');
  });
});
