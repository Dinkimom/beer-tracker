import { describe, expect, it } from 'vitest';

import {
  type AccessProfile,
  canAccessAdminShell,
  canManageTeamInAdmin,
  canUsePlanner,
  filterTeamsVisibleInPlanner,
  isOrganizationAdminProfile,
  isTeamLeadForTeam,
  managedTeamIdsForAccessProfile,
} from './orgAccess';

function profile(p: Partial<AccessProfile> & Pick<AccessProfile, 'organizationId' | 'orgRole' | 'userId'>): AccessProfile {
  return {
    organizationId: p.organizationId,
    orgRole: p.orgRole,
    teamMemberships: p.teamMemberships ?? [],
    userId: p.userId,
  };
}

describe('canAccessAdminShell', () => {
  it('allows org_admin without teams', () => {
    expect(
      canAccessAdminShell(
        profile({
          organizationId: 'o1',
          orgRole: 'org_admin',
          userId: 'u1',
        })
      )
    ).toBe(true);
  });

  it('denies team lead membership without org admin', () => {
    expect(
      canAccessAdminShell(
        profile({
          organizationId: 'o1',
          orgRole: 'member',
          teamMemberships: [{ isTeamLead: true, isTeamMember: false, teamId: 't1' }],
          userId: 'u1',
        })
      )
    ).toBe(false);
  });

  it('denies member without lead', () => {
    expect(
      canAccessAdminShell(
        profile({
          organizationId: 'o1',
          orgRole: 'member',
          teamMemberships: [{ isTeamLead: false, isTeamMember: true, teamId: 't1' }],
          userId: 'u1',
        })
      )
    ).toBe(false);
  });

  it('denies org team_lead without admins row', () => {
    expect(
      canAccessAdminShell(
        profile({
          organizationId: 'o1',
          orgRole: 'team_lead',
          userId: 'u1',
        })
      )
    ).toBe(false);
  });
});

describe('canUsePlanner', () => {
  it('allows org_admin without teams', () => {
    expect(
      canUsePlanner(
        profile({
          organizationId: 'o1',
          orgRole: 'org_admin',
          userId: 'u1',
        })
      )
    ).toBe(true);
  });

  it('allows member with team', () => {
    expect(
      canUsePlanner(
        profile({
          organizationId: 'o1',
          orgRole: 'member',
          teamMemberships: [{ isTeamLead: false, isTeamMember: true, teamId: 't1' }],
          userId: 'u1',
        })
      )
    ).toBe(true);
  });

  it('denies member without teams', () => {
    expect(
      canUsePlanner(
        profile({
          organizationId: 'o1',
          orgRole: 'member',
          userId: 'u1',
        })
      )
    ).toBe(false);
  });

  it('denies org team_lead without teams', () => {
    expect(
      canUsePlanner(
        profile({
          organizationId: 'o1',
          orgRole: 'team_lead',
          userId: 'u1',
        })
      )
    ).toBe(false);
  });
});

describe('filterTeamsVisibleInPlanner', () => {
  it('returns all teams for org_admin', () => {
    const teams = [{ id: 't1' }, { id: 't2' }];
    const p = profile({ organizationId: 'o1', orgRole: 'org_admin', userId: 'u1' });
    expect(filterTeamsVisibleInPlanner(p, teams)).toEqual(teams);
  });

  it('filters to member or lead teams only', () => {
    const p = profile({
      organizationId: 'o1',
      orgRole: 'member',
      teamMemberships: [
        { isTeamLead: false, isTeamMember: true, teamId: 't1' },
        { isTeamLead: true, isTeamMember: false, teamId: 't3' },
      ],
      userId: 'u1',
    });
    expect(
      filterTeamsVisibleInPlanner(p, [
        { id: 't1', title: 'A' },
        { id: 't2', title: 'B' },
        { id: 't3', title: 'C' },
      ])
    ).toEqual([
      { id: 't1', title: 'A' },
      { id: 't3', title: 'C' },
    ]);
  });
});

describe('managedTeamIdsForAccessProfile', () => {
  it('returns null for org_admin', () => {
    expect(
      managedTeamIdsForAccessProfile(
        profile({ organizationId: 'o1', orgRole: 'org_admin', userId: 'u1' })
      )
    ).toBeNull();
  });

  it('returns empty list for non-admin even if they are a catalog lead', () => {
    expect(
      managedTeamIdsForAccessProfile(
        profile({
          organizationId: 'o1',
          orgRole: 'member',
          teamMemberships: [
            { isTeamLead: true, isTeamMember: false, teamId: 't1' },
            { isTeamLead: false, isTeamMember: true, teamId: 't2' },
          ],
          userId: 'u1',
        })
      )
    ).toEqual([]);
  });
});

describe('isOrganizationAdminProfile', () => {
  it('true only for org_admin', () => {
    expect(
      isOrganizationAdminProfile(
        profile({ organizationId: 'o1', orgRole: 'org_admin', userId: 'u1' })
      )
    ).toBe(true);
    expect(
      isOrganizationAdminProfile(
        profile({ organizationId: 'o1', orgRole: 'member', userId: 'u1' })
      )
    ).toBe(false);
  });
});

describe('isTeamLeadForTeam', () => {
  it('matches team id and lead flag', () => {
    const p = profile({
      organizationId: 'o1',
      orgRole: 'member',
      teamMemberships: [{ isTeamLead: true, isTeamMember: false, teamId: 't1' }],
      userId: 'u1',
    });
    expect(isTeamLeadForTeam(p, 't1')).toBe(true);
    expect(isTeamLeadForTeam(p, 't2')).toBe(false);
  });
});

describe('canManageTeamInAdmin', () => {
  it('allows org_admin for any team id', () => {
    const p = profile({ organizationId: 'o1', orgRole: 'org_admin', userId: 'u1' });
    expect(canManageTeamInAdmin(p, 'any-uuid')).toBe(true);
  });

  it('denies catalog team lead — admin roster is org_admin only', () => {
    const p = profile({
      organizationId: 'o1',
      orgRole: 'member',
      teamMemberships: [{ isTeamLead: true, isTeamMember: false, teamId: 't1' }],
      userId: 'u1',
    });
    expect(canManageTeamInAdmin(p, 't1')).toBe(false);
    expect(canManageTeamInAdmin(p, 't2')).toBe(false);
  });

  it('denies plain member', () => {
    const p = profile({
      organizationId: 'o1',
      orgRole: 'member',
      teamMemberships: [{ isTeamLead: false, isTeamMember: true, teamId: 't1' }],
      userId: 'u1',
    });
    expect(canManageTeamInAdmin(p, 't1')).toBe(false);
  });
});
