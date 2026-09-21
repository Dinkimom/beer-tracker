import type { UpdateStaffPatch } from '@/lib/staffTeams/staffRepository';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  deleteStaffFromAdmin,
  normalizeOptionalStaffText,
  optionalStaffAvatarUrlSchema,
  optionalStaffEmailSchema,
  optionalStaffTrackerIdSchema,
  patchStaffFromAdmin,
  staffEmailFromInput,
} from '@/lib/admin/adminStaffRouteHelpers';
import { requireTenantOrgAdmin } from '@/lib/api-tenant';

const UuidSchema = z.string().uuid();

const PatchBodySchema = z
  .object({
    avatar_url: optionalStaffAvatarUrlSchema,
    display_name: z.string().trim().min(1).max(512).optional(),
    email: optionalStaffEmailSchema,
    team_ids: z.array(z.string().uuid()).optional(),
    tracker_user_id: optionalStaffTrackerIdSchema,
  })
  .refine(
    (data) =>
      data.display_name !== undefined ||
      data.email !== undefined ||
      data.tracker_user_id !== undefined ||
      data.avatar_url !== undefined ||
      data.team_ids !== undefined,
    { message: 'Нет полей для обновления' }
  );

function writeFromPatch(parsed: z.infer<typeof PatchBodySchema>): NextResponse | UpdateStaffPatch {
  const write: UpdateStaffPatch = {};
  if (parsed.display_name !== undefined) {
    write.display_name = parsed.display_name;
  }
  if (parsed.email !== undefined) {
    const email = staffEmailFromInput(parsed.email);
    if (email instanceof NextResponse) {
      return email;
    }
    write.email = email;
  }
  if (parsed.tracker_user_id !== undefined) {
    write.tracker_user_id = normalizeOptionalStaffText(parsed.tracker_user_id);
  }
  if (parsed.avatar_url !== undefined) {
    write.avatar_url = normalizeOptionalStaffText(parsed.avatar_url);
  }
  return write;
}

/**
 * PATCH /api/admin/organizations/[organizationId]/staff/[staffId]
 * org_admin: изменить имя, email, идентификатор в трекере или URL аватара.
 */
export async function PATCH(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string; staffId: string }> }
) {
  const { organizationId, staffId: staffIdRaw } = await routeContext.params;

  const orgParsed = UuidSchema.safeParse(organizationId.trim());
  if (!orgParsed.success) {
    return NextResponse.json({ error: 'Некорректный organization id' }, { status: 400 });
  }
  const staffParsed = UuidSchema.safeParse(staffIdRaw.trim());
  if (!staffParsed.success) {
    return NextResponse.json({ error: 'Некорректный идентификатор сотрудника' }, { status: 400 });
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
    const msg = parsed.error.issues[0]?.message ?? 'Некорректное тело запроса';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const write = writeFromPatch(parsed.data);
  if (write instanceof NextResponse) {
    return write;
  }

  return patchStaffFromAdmin({
    orgId: auth.ctx.organizationId,
    staffId: staffParsed.data,
    teamIds: parsed.data.team_ids,
    write,
  });
}

/**
 * DELETE /api/admin/organizations/[organizationId]/staff/[staffId]
 * org_admin: удалить сотрудника из каталога.
 */
export async function DELETE(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string; staffId: string }> }
) {
  const { organizationId, staffId: staffIdRaw } = await routeContext.params;

  const orgParsed = UuidSchema.safeParse(organizationId.trim());
  if (!orgParsed.success) {
    return NextResponse.json({ error: 'Некорректный organization id' }, { status: 400 });
  }
  const staffParsed = UuidSchema.safeParse(staffIdRaw.trim());
  if (!staffParsed.success) {
    return NextResponse.json({ error: 'Некорректный идентификатор сотрудника' }, { status: 400 });
  }

  const auth = await requireTenantOrgAdmin(request, orgParsed.data);
  if ('response' in auth) {
    return auth.response;
  }

  return deleteStaffFromAdmin({
    orgId: auth.ctx.organizationId,
    requesterUserId: auth.ctx.userId,
    staffId: staffParsed.data,
  });
}
