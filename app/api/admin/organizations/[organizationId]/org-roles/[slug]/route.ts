import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireOrgAdmin, requireTenantForOrganization } from '@/lib/api-tenant';
import { orgRoleToEntry } from '@/lib/roles/effectiveCatalog';
import { deleteOrgRoleAndClearMembers, updateOrgRole } from '@/lib/roles/orgRolesRepository';
import { formatValidationError } from '@/lib/validation';

const UpdateBodySchema = z
  .object({
    domainRole: z.enum(['developer', 'tester', 'other']).optional(),
    platforms: z.array(z.enum(['back', 'web'])).optional(),
    title: z.string().trim().min(1).max(128).optional(),
  })
  .refine((d) => d.title !== undefined || d.domainRole !== undefined || d.platforms !== undefined, {
    message: 'Укажите хотя бы одно поле для обновления',
  });

/**
 * PATCH /api/admin/organizations/[organizationId]/org-roles/[slug]
 * org_admin: обновить title / domainRole / platforms (slug не меняется).
 */
export async function PATCH(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string; slug: string }> }
) {
  const { organizationId, slug: slugParam } = await routeContext.params;
  const slug = decodeURIComponent(slugParam).trim().toLowerCase();

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

  const parsed = UpdateBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: formatValidationError(parsed.error) }, { status: 400 });
  }

  const row = await updateOrgRole(auth.ctx.organizationId, slug, parsed.data);
  if (!row) {
    return NextResponse.json({ error: 'Роль не найдена' }, { status: 404 });
  }

  return NextResponse.json(
    { role: orgRoleToEntry(row) },
    { status: 200 }
  );
}

/**
 * DELETE /api/admin/organizations/[organizationId]/org-roles/[slug]
 * org_admin: удалить роль и обнулить role_slug у участников.
 */
export async function DELETE(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string; slug: string }> }
) {
  if (request) {
    // keep signature aligned with Next.js route handlers.
  }
  const { organizationId, slug: slugParam } = await routeContext.params;
  const slug = decodeURIComponent(slugParam).trim().toLowerCase();

  const auth = await requireTenantForOrganization(request, organizationId);
  if (auth.response) {
    return auth.response;
  }
  const denied = requireOrgAdmin(auth.ctx);
  if (denied) {
    return denied;
  }

  const ok = await deleteOrgRoleAndClearMembers(auth.ctx.organizationId, slug);
  if (!ok) {
    return NextResponse.json({ error: 'Роль не найдена' }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
