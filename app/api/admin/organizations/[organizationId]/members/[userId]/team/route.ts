import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireTenantOrgAdmin } from '@/lib/api-tenant';
import { setOrganizationMemberTeam } from '@/lib/organizations/setOrganizationMemberTeam';

const PatchBodySchema = z.object({
  team_id: z.union([z.string().uuid(), z.null()]),
});

/**
 * PATCH /api/admin/organizations/[organizationId]/members/[userId]/team
 * org_admin: сменить команду пользователя или снять с команды (`team_id: null`).
 */
export async function PATCH(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string; userId: string }> }
) {
  const { organizationId, userId: userIdRaw } = await routeContext.params;
  const auth = await requireTenantOrgAdmin(request, organizationId);
  if ('response' in auth) {
    return auth.response;
  }

  const userIdParsed = z.string().uuid().safeParse(userIdRaw);
  if (!userIdParsed.success) {
    return NextResponse.json({ error: 'Некорректный идентификатор пользователя' }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
  }

  const parsed = PatchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Укажите team_id (uuid или null)' }, { status: 400 });
  }

  const result = await setOrganizationMemberTeam({
    organizationId: auth.ctx.organizationId,
    preservePlannerTeamRole: true,
    teamId: parsed.data.team_id,
    userId: userIdParsed.data,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
