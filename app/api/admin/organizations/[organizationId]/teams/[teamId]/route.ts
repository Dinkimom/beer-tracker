import { NextResponse } from 'next/server';

import {
  denyTeamLeadSensitivePatch,
  executeTeamPatchUpdate,
  parseTeamRouteTeamId,
  requireTeamPatchAccess,
  validateTeamPatchConflicts,
} from '@/lib/admin/adminTeamPatchRouteHelpers';
import {
  requireOrgAdminProfile,
  requireTenantWithAdminProfile,
} from '@/lib/api-tenant';
import { deleteTeam, findTeamById, listTeams } from '@/lib/staffTeams';

/**
 * PATCH /api/admin/organizations/[organizationId]/teams/[teamId]
 */
export async function PATCH(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string; teamId: string }> }
) {
  const { organizationId, teamId: teamIdRaw } = await routeContext.params;
  const teamIdParsed = parseTeamRouteTeamId(teamIdRaw);
  if (teamIdParsed instanceof NextResponse) {
    return teamIdParsed;
  }
  const teamId = teamIdParsed;

  const access = await requireTeamPatchAccess(request, organizationId, teamId);
  if (access instanceof NextResponse) {
    return access;
  }
  const { auth, patch } = access;

  const deniedSensitive = denyTeamLeadSensitivePatch(auth.profile, patch);
  if (deniedSensitive) {
    return deniedSensitive;
  }

  const existing = await findTeamById(auth.ctx.organizationId, teamId);
  if (!existing) {
    return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 });
  }

  const orgTeams = await listTeams(auth.ctx.organizationId, { activeOnly: false });
  const conflict = validateTeamPatchConflicts({ orgTeams, patch, teamId });
  if (conflict) {
    return conflict;
  }

  return executeTeamPatchUpdate(auth.ctx.organizationId, teamId, patch);
}

/**
 * DELETE /api/admin/organizations/[organizationId]/teams/[teamId]
 */
export async function DELETE(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string; teamId: string }> }
) {
  const { organizationId, teamId: teamIdRaw } = await routeContext.params;
  const teamIdParsed = parseTeamRouteTeamId(teamIdRaw);
  if (teamIdParsed instanceof NextResponse) {
    return teamIdParsed;
  }
  const teamId = teamIdParsed;

  const auth = await requireTenantWithAdminProfile(request, organizationId);
  if ('response' in auth) {
    return auth.response;
  }
  const denied = requireOrgAdminProfile(auth.profile);
  if (denied) {
    return denied;
  }

  const ok = await deleteTeam(auth.ctx.organizationId, teamId);
  if (!ok) {
    return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
