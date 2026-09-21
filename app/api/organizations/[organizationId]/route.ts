import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireTenantForOrganization, requireTenantOrgAdmin } from '@/lib/api-tenant';
import { findOrganizationById, updateOrganization } from '@/lib/organizations';

const PatchBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
});

/**
 * GET /api/organizations/[organizationId]
 * Карточка организации для участника (tenant guard по пути, без заголовка).
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
  const org = await findOrganizationById(auth.ctx.organizationId);
  if (!org) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }
  return NextResponse.json({
    organization: {
      id: org.id,
      initialSyncCompletedAt: org.initial_sync_completed_at,
      name: org.name,
      slug: org.slug,
    },
    role: auth.ctx.role,
  });
}

/**
 * PATCH /api/organizations/[organizationId] — сменить название (только org_admin).
 */
export async function PATCH(
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
  const parsed = PatchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Укажите название организации' }, { status: 400 });
  }
  const updated = await updateOrganization(auth.ctx.organizationId, { name: parsed.data.name });
  if (!updated) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }
  return NextResponse.json({
    organization: {
      id: updated.id,
      initialSyncCompletedAt: updated.initial_sync_completed_at,
      name: updated.name,
      slug: updated.slug,
    },
  });
}
