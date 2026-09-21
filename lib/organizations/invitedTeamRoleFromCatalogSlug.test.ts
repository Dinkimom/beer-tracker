import { describe, expect, it } from 'vitest';

import {
  CATALOG_TEAMLEAD_SLUG,
  catalogRoleSlugForPlannerTeamRole,
  invitedTeamRoleFromCatalogRoleSlug,
} from './invitedTeamRoleFromCatalogSlug';

describe('invitedTeamRoleFromCatalogRoleSlug', () => {
  it(`maps ${CATALOG_TEAMLEAD_SLUG} to team_lead (case-insensitive)`, () => {
    expect(invitedTeamRoleFromCatalogRoleSlug('teamlead')).toBe('team_lead');
    expect(invitedTeamRoleFromCatalogRoleSlug('TeamLead')).toBe('team_lead');
  });

  it('maps other slugs and empty to team_member', () => {
    expect(invitedTeamRoleFromCatalogRoleSlug('frontend')).toBe('team_member');
    expect(invitedTeamRoleFromCatalogRoleSlug('')).toBe('team_member');
    expect(invitedTeamRoleFromCatalogRoleSlug(null)).toBe('team_member');
    expect(invitedTeamRoleFromCatalogRoleSlug(undefined)).toBe('team_member');
  });
});

describe('catalogRoleSlugForPlannerTeamRole', () => {
  it('writes teamlead for planner lead and null for member', () => {
    expect(catalogRoleSlugForPlannerTeamRole('team_lead')).toBe(CATALOG_TEAMLEAD_SLUG);
    expect(catalogRoleSlugForPlannerTeamRole('team_member')).toBeNull();
  });
});
