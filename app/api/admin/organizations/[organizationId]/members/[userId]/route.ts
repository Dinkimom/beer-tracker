import type { OrgMemberRole } from '@/lib/organizations/types';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { validateOrgMemberRoleChange } from '@/lib/admin/adminOrgMemberPatchHelpers';
import { deleteStaffFromAdmin } from '@/lib/admin/adminStaffRouteHelpers';
import { requireTenantOrgAdmin } from '@/lib/api-tenant';
import { updateOrganizationMemberRole } from '@/lib/organizations/organizationMembersRepository';

const UuidSchema = z.string().uuid();

const PatchBodySchema = z.object({
  org_role: z.enum(['member', 'org_admin']),
});

/**
 * PATCH /api/admin/organizations/[organizationId]/members/[userId]
 * org_admin: выдать или снять права администратора организации (member | org_admin).
 */
export async function PATCH(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string; userId: string }> }
) {
  const { organizationId, userId: userIdRaw } = await routeContext.params;

  const orgParsed = UuidSchema.safeParse(organizationId.trim());
  if (!orgParsed.success) {
    return NextResponse.json({ error: 'Некорректный organization id' }, { status: 400 });
  }

  const userParsed = UuidSchema.safeParse(userIdRaw.trim());
  if (!userParsed.success) {
    return NextResponse.json({ error: 'Некорректный идентификатор пользователя' }, { status: 400 });
  }

  const auth = await requireTenantOrgAdmin(request, orgParsed.data);
  if ('response' in auth) {
    return auth.response;
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
  }

  const parsed = PatchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Укажите org_role: member или org_admin' },
      { status: 400 }
    );
  }

  const orgId = auth.ctx.organizationId;
  const targetUserId = userParsed.data;
  const nextRole: OrgMemberRole = parsed.data.org_role;

  const roleChangeError = await validateOrgMemberRoleChange({
    nextRole,
    orgId,
    requesterUserId: auth.ctx.userId,
    targetUserId,
  });
  if (roleChangeError) {
    return roleChangeError;
  }

  const updated = await updateOrganizationMemberRole(orgId, targetUserId, nextRole);
  if (!updated) {
    return NextResponse.json({ error: 'Не удалось обновить роль' }, { status: 500 });
  }

  return NextResponse.json({
    member: { org_role: updated.role, userId: updated.user_id },
  });
}

/**
 * DELETE /api/admin/organizations/[organizationId]/members/[userId]
 * org_admin: удалить сотрудника из каталога.
 */
export async function DELETE(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string; userId: string }> }
) {
  const { organizationId, userId: userIdRaw } = await routeContext.params;

  const orgParsed = UuidSchema.safeParse(organizationId.trim());
  if (!orgParsed.success) {
    return NextResponse.json({ error: 'Некорректный organization id' }, { status: 400 });
  }

  const userParsed = UuidSchema.safeParse(userIdRaw.trim());
  if (!userParsed.success) {
    return NextResponse.json({ error: 'Некорректный идентификатор пользователя' }, { status: 400 });
  }

  const auth = await requireTenantOrgAdmin(request, orgParsed.data);
  if ('response' in auth) {
    return auth.response;
  }

  return deleteStaffFromAdmin({
    orgId: auth.ctx.organizationId,
    requesterUserId: auth.ctx.userId,
    staffId: userParsed.data,
  });
}
