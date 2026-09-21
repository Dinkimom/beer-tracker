import { NextResponse } from 'next/server';

import { parseTeamRouteIds, requireTeamManagementForRoute } from '@/lib/admin/adminTeamRouteHelpers';
import { assertTeamExists } from '@/lib/admin/adminTeamsRouteHelpers';
import { searchRegistryEmployeesForTeam } from '@/lib/staffTeams';

/**
 * GET /api/admin/organizations/[organizationId]/teams/[teamId]/registry-search?q=...
 * Поиск сотрудников из public.registry_employees для добавления в команду.
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

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }
  const pattern = `%${q.replace(/%/g, '\\%')}%`;

  const items = await searchRegistryEmployeesForTeam({
    pattern,
    teamId: parsed.teamId,
  });

  return NextResponse.json({ items });
}
