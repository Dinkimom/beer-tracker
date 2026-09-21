import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireTenantOrgAdmin } from '@/lib/api-tenant';
import {
  AddTrackerTeamMemberError,
  addTrackerPersonToOrganizationWithProductUser,
} from '@/lib/onPrem/addTrackerPersonToTeamWithProductUser';
import {
  listOrganizationMemberDirectory,
  parseMemberDirectoryTeamsJson,
} from '@/lib/organizations/organizationMembersRepository';

const OrgRoleInviteSchema = z.enum(['member', 'team_lead']);

const PostFromTrackerSchema = z
  .object({
    display_name: z.string().trim().min(1).max(512).optional(),
    email: z.string().trim().email().max(320),
    org_role: OrgRoleInviteSchema,
    role_slug: z.string().trim().min(1).max(128).optional().nullable(),
    team_id: z.string().uuid().optional().nullable(),
    tracker_user_id: z.string().min(1).max(256),
  })
  .superRefine((data, ctx) => {
    const slug = data.role_slug?.trim();
    if (slug && !data.team_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Роль каталога можно указать только вместе с командой',
        path: ['role_slug'],
      });
    }
  });

/**
 * GET /api/admin/organizations/[organizationId]/members
 * org_admin: участники organization_members.
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const auth = await requireTenantOrgAdmin(request, organizationId);
  if ('response' in auth) {
    return auth.response;
  }

  const orgId = auth.ctx.organizationId;
  const rows = await listOrganizationMemberDirectory(orgId);

  return NextResponse.json({
    members: rows.map((r) => ({
      addedAt: new Date(r.created_at).toISOString(),
      email: r.email,
      hasTeamMembership: r.has_team_membership,
      orgRole: r.org_role,
      teams: parseMemberDirectoryTeamsJson(r.teams_json).map((t) => ({
        isTeamLead: Boolean(t.is_team_lead),
        isTeamMember: Boolean(t.is_team_member),
        teamId: t.team_id,
        title: t.title,
      })),
      userId: r.user_id,
    })),
  });
}

/**
 * POST /api/admin/organizations/[organizationId]/members
 * org_admin: добавить сотрудника из трекера в организацию (роль в системе обязательна), опционально — в команду с ролью каталога.
 */
export async function POST(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const auth = await requireTenantOrgAdmin(request, organizationId);
  if ('response' in auth) {
    return auth.response;
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
  }

  const parsed = PostFromTrackerSchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Некорректное тело запроса';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const orgId = auth.ctx.organizationId;
  const { display_name, email, org_role: orgRole, role_slug: roleSlug, team_id: teamId, tracker_user_id } =
    parsed.data;

  try {
    const { member } = await addTrackerPersonToOrganizationWithProductUser({
      displayName: display_name,
      emailStr: email,
      organizationId: orgId,
      orgRole,
      roleSlug: roleSlug ?? null,
      teamId: teamId ?? null,
      trackerUserId: tracker_user_id,
    });
    return NextResponse.json({ member }, { status: 201 });
  } catch (e) {
    if (e instanceof AddTrackerTeamMemberError) {
      return NextResponse.json({ error: e.message }, { status: e.httpStatus });
    }
    throw e;
  }
}
