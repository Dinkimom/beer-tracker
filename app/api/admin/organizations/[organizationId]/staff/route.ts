import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createStaffFromAdminPost,
  optionalStaffAvatarUrlSchema,
  optionalStaffEmailSchema,
  staffEmailFromInput,
} from '@/lib/admin/adminStaffRouteHelpers';
import { requireOrgAdmin, requireTenantForOrganization } from '@/lib/api-tenant';
import { listStaff } from '@/lib/staffTeams';

const PostBodySchema = z.object({
  avatar_url: optionalStaffAvatarUrlSchema,
  display_name: z.string().trim().min(1).max(512),
  email: optionalStaffEmailSchema,
  team_ids: z.array(z.string().uuid()).optional(),
  tracker_user_id: z.string().trim().min(1).max(256),
});

/**
 * GET /api/admin/organizations/[organizationId]/staff
 * org_admin: список сотрудников организации.
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;

  const auth = await requireTenantForOrganization(request, organizationId);
  if (auth.response) {
    return auth.response;
  }
  const denied = requireOrgAdmin(auth.ctx);
  if (denied) {
    return denied;
  }

  const staff = await listStaff(auth.ctx.organizationId);
  return NextResponse.json({ staff });
}

/**
 * POST /api/admin/organizations/[organizationId]/staff
 * org_admin: создать сотрудника.
 */
export async function POST(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const auth = await requireTenantForOrganization(request, organizationId);
  if (auth.response) {
    return auth.response;
  }
  const denied = requireOrgAdmin(auth.ctx);
  if (denied) {
    return denied;
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
  }

  const parsed = PostBodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Укажите имя сотрудника';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const email = staffEmailFromInput(parsed.data.email);
  if (email instanceof NextResponse) {
    return email;
  }

  return createStaffFromAdminPost(auth.ctx.organizationId, {
    avatar_url: parsed.data.avatar_url?.trim() || null,
    display_name: parsed.data.display_name,
    email,
    team_ids: parsed.data.team_ids,
    tracker_user_id: parsed.data.tracker_user_id,
  });
}
