import { NextResponse } from 'next/server';

import { postTeamMemberRoute } from '@/lib/admin/adminTeamMembersPostRouteHelpers';
import { parseTeamRouteIds, requireTeamManagementForRoute } from '@/lib/admin/adminTeamRouteHelpers';
import { assertTeamExists } from '@/lib/admin/adminTeamsRouteHelpers';
import { listTeamMembersWithStaff } from '@/lib/staffTeams';

/**
 * GET /api/admin/organizations/[organizationId]/teams/[teamId]/members
 * org_admin: список участников команды.
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string; teamId: string }> }
) {
  const { organizationId, teamId: teamIdRaw } = await routeContext.params;

  const parsed = parseTeamRouteIds(teamIdRaw);
  if (parsed instanceof NextResponse) {
    return parsed;
  }

  const auth = await requireTeamManagementForRoute(request, organizationId, parsed.teamId);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const team = await assertTeamExists(auth.ctx.organizationId, parsed.teamId);
  if (team instanceof NextResponse) {
    return team;
  }

  const members = await listTeamMembersWithStaff(auth.ctx.organizationId, parsed.teamId);
  return NextResponse.json({ members });
}

/**
 * POST /api/admin/organizations/[organizationId]/teams/[teamId]/members
 * - `user_id`: пользователь уже в организации (без команды) — в состав команды и права планера, без приглашения.
 * - `tracker_user_id` + `email`: из трекера — в состав команды и сразу учётка продукта для планера (без приглашений).
 * Роль каталога `teamlead` → тимлид в планере, иначе участник.
 */
export async function POST(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string; teamId: string }> }
) {
  const { organizationId, teamId } = await routeContext.params;
  return postTeamMemberRoute(request, organizationId, teamId);
}
