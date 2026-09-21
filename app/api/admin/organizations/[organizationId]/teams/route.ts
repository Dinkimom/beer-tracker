import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createTeamFromAdminPost } from '@/lib/admin/adminCreateTeamHelpers';
import { requireOrgAdminProfile, requireTenantWithAdminProfile } from '@/lib/api-tenant';
import { listTeams } from '@/lib/staffTeams';

const BoardIdSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^\d+$/).transform((s) => Number.parseInt(s, 10)),
]);

const PostBodySchema = z.object({
  active: z.boolean().optional(),
  slug: z.string().trim().min(1).max(128).optional(),
  title: z.string().trim().min(1).max(256),
  tracker_board_id: BoardIdSchema,
  tracker_queue_key: z.string().trim().min(1).max(256),
});

/**
 * GET /api/admin/organizations/[organizationId]/teams
 * org_admin: все команды организации.
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const auth = await requireTenantWithAdminProfile(request, organizationId);
  if ('response' in auth) {
    return auth.response;
  }
  const { ctx } = auth;

  const teams = await listTeams(ctx.organizationId, { activeOnly: false });
  return NextResponse.json({ teams });
}

/**
 * POST /api/admin/organizations/[organizationId]/teams
 * org_admin: создать команду с привязкой к доске трекера.
 */
export async function POST(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const auth = await requireTenantWithAdminProfile(request, organizationId);
  if ('response' in auth) {
    return auth.response;
  }
  const denied = requireOrgAdminProfile(auth.profile);
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
    return NextResponse.json(
      { error: 'Укажите название, очередь и доску' },
      { status: 400 }
    );
  }

  const orgTeams = await listTeams(auth.ctx.organizationId, { activeOnly: false });
  return createTeamFromAdminPost({
    orgId: auth.ctx.organizationId,
    orgTeams,
    payload: parsed.data,
  });
}
