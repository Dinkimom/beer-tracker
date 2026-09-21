import { NextResponse } from 'next/server';
import { z } from 'zod';

import { removeTeamMember, updateTeamMemberRole } from '@/lib/staffTeams';

import { parseTeamRouteIds, requireTeamManagementForRoute } from './adminTeamRouteHelpers';

const PatchBodySchema = z.object({
  role_slug: z.string().trim().max(128).nullable(),
});

interface StaffTeamRouteIds { staffId: string; teamId: string }

function resolveStaffTeamRouteIds(
  teamIdRaw: string,
  staffIdRaw: string
): NextResponse | StaffTeamRouteIds {
  const ids = parseTeamRouteIds(teamIdRaw, staffIdRaw);
  if (ids instanceof NextResponse) return ids;
  if (!('staffId' in ids) || !ids.staffId) {
    return NextResponse.json({ error: 'Некорректный идентификатор сотрудника' }, { status: 400 });
  }
  return { staffId: ids.staffId, teamId: ids.teamId };
}

export async function patchTeamMemberStaffRoute(
  request: Request,
  organizationId: string,
  teamIdRaw: string,
  staffIdRaw: string
) {
  const resolved = resolveStaffTeamRouteIds(teamIdRaw, staffIdRaw);
  if (resolved instanceof NextResponse) return resolved;
  const { staffId, teamId } = resolved;

  const auth = await requireTeamManagementForRoute(request, organizationId, teamId);
  if (auth instanceof NextResponse) return auth;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
  }
  const parsed = PatchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Укажите role_slug (строка или null)' }, { status: 400 });
  }

  const member = await updateTeamMemberRole(
    auth.ctx.organizationId,
    teamId,
    staffId,
    parsed.data.role_slug
  );
  if (!member) {
    return NextResponse.json({ error: 'Участник не найден' }, { status: 404 });
  }
  return NextResponse.json({ member });
}

export async function deleteTeamMemberStaffRoute(
  request: Request,
  organizationId: string,
  teamIdRaw: string,
  staffIdRaw: string
) {
  const resolved = resolveStaffTeamRouteIds(teamIdRaw, staffIdRaw);
  if (resolved instanceof NextResponse) return resolved;
  const { staffId, teamId } = resolved;

  const auth = await requireTeamManagementForRoute(request, organizationId, teamId);
  if (auth instanceof NextResponse) return auth;

  const ok = await removeTeamMember(auth.ctx.organizationId, teamId, staffId);
  if (!ok) {
    return NextResponse.json({ error: 'Участник не найден' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
