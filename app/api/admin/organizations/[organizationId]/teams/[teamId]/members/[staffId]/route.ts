import {
  deleteTeamMemberStaffRoute,
  patchTeamMemberStaffRoute,
} from '@/lib/admin/adminTeamMemberStaffRouteHelpers';

/**
 * PATCH /api/admin/organizations/[organizationId]/teams/[teamId]/members/[staffId]
 * org_admin: обновить роль участника команды.
 * Body: { role_slug: string | null }
 */
export async function PATCH(
  request: Request,
  routeContext: {
    params: Promise<{ organizationId: string; staffId: string; teamId: string }>;
  }
) {
  const { organizationId, teamId, staffId } = await routeContext.params;
  return patchTeamMemberStaffRoute(request, organizationId, teamId, staffId);
}

/**
 * DELETE /api/admin/organizations/[organizationId]/teams/[teamId]/members/[staffId]
 * org_admin: удалить участника из команды.
 */
export async function DELETE(
  request: Request,
  routeContext: {
    params: Promise<{ organizationId: string; staffId: string; teamId: string }>;
  }
) {
  const { organizationId, teamId, staffId } = await routeContext.params;
  return deleteTeamMemberStaffRoute(request, organizationId, teamId, staffId);
}
