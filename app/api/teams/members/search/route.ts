import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { roleCatalogEntriesToResolutionSlices } from '@/lib/roles/catalog';
import { getEffectiveRoles } from '@/lib/roles/effectiveCatalog';
import { listOrgRoles } from '@/lib/roles/orgRolesRepository';
import { listSystemRoles } from '@/lib/roles/systemRolesRepository';
import { enrichPlannerTeamMembersFromTracker, fetchAllTeamMembersForOrg } from '@/lib/staffTeams';
import { convertTeamMemberToDeveloper } from '@/lib/teamMemberUtils';

/**
 * GET /api/teams/members/search?query={query}
 * Поиск участников по всем командам организации (PostgreSQL приложения).
 */
export async function GET(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId } = tenantResult.ctx;

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';

    const [allTeamMembersRaw, systemRows, orgRows] = await Promise.all([
      fetchAllTeamMembersForOrg(organizationId),
      listSystemRoles(),
      listOrgRoles(organizationId),
    ]);

    const allTeamMembers = await enrichPlannerTeamMembersFromTracker(
      organizationId,
      allTeamMembersRaw
    );

    const roleCtx = roleCatalogEntriesToResolutionSlices(
      getEffectiveRoles(systemRows, orgRows)
    );

    let filteredMembers = allTeamMembers;
    if (query.trim()) {
      const queryLower = query.toLowerCase().trim();
      filteredMembers = allTeamMembers.filter((member) => {
        const displayName = member.displayName.toLowerCase();
        const email = member.email?.toLowerCase() || '';
        const firstName = member.firstName.toLowerCase() || '';
        const lastName = member.lastName.toLowerCase() || '';
        const teamTitle = member.team.title?.toLowerCase() || '';
        const trackerUid = member.tracker_uid?.toLowerCase() || '';

        return (
          displayName.includes(queryLower) ||
          email.includes(queryLower) ||
          firstName.includes(queryLower) ||
          lastName.includes(queryLower) ||
          teamTitle.includes(queryLower) ||
          trackerUid.includes(queryLower)
        );
      });
    }

    const developersWithTeam = filteredMembers.flatMap((member) => {
      const dev = convertTeamMemberToDeveloper(member, roleCtx);
      if (!dev) {
        return [];
      }
      return [
        {
          ...dev,
          staffUid: member.uid,
          teamTitle: member.team.title,
          teamBoard: member.team.board,
        },
      ];
    });

    return NextResponse.json({
      teamMembers: filteredMembers,
      developers: developersWithTeam,
      count: filteredMembers.length,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to search team members');
  }
}
