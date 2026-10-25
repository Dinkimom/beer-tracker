import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireOrgAdminForOrganizationRoute } from '@/lib/admin/adminOrgRouteHelpers';
import {
  createStaffFromAdminPost,
  optionalStaffAvatarUrlSchema,
  optionalStaffEmailSchema,
  staffEmailFromInput,
} from '@/lib/admin/adminStaffRouteHelpers';
import { listStaff } from '@/lib/staffTeams';

const PostBodySchema = z
  .object({
    avatar_url: optionalStaffAvatarUrlSchema,
    display_name: z.string().trim().min(1).max(512),
    email: optionalStaffEmailSchema,
    role_slug: z.string().trim().min(1).max(128).optional().nullable(),
    team_ids: z.array(z.string().uuid()).optional(),
    tracker_user_id: z.string().trim().min(1).max(256),
  })
  .superRefine((data, ctx) => {
    const slug = data.role_slug?.trim();
    if (slug && !(data.team_ids && data.team_ids.length > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Роль каталога можно указать только вместе с командой',
        path: ['role_slug'],
      });
    }
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

  const auth = await requireOrgAdminForOrganizationRoute(request, organizationId);
  if ('response' in auth) {
    return auth.response;
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
  const auth = await requireOrgAdminForOrganizationRoute(request, organizationId);
  if ('response' in auth) {
    return auth.response;
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
    role_slug: parsed.data.role_slug?.trim() || null,
    team_ids: parsed.data.team_ids,
    tracker_user_id: parsed.data.tracker_user_id,
  });
}
