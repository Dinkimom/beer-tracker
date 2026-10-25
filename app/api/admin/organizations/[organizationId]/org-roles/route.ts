import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireOrgAdminForOrganizationRoute } from '@/lib/admin/adminOrgRouteHelpers';
import { orgRoleToEntry } from '@/lib/roles/effectiveCatalog';
import { createOrgRole } from '@/lib/roles/orgRolesRepository';
import { systemRoleSlugExists } from '@/lib/roles/systemRolesRepository';
import { formatValidationError } from '@/lib/validation';

const CreateBodySchema = z.object({
  domainRole: z.enum(['developer', 'tester', 'other']),
  platforms: z.array(z.enum(['back', 'web'])),
  slug: z.string().trim().min(1).max(64).regex(/^[a-z0-9_-]+$/),
  title: z.string().trim().min(1).max(128),
});

/**
 * POST /api/admin/organizations/[organizationId]/org-roles
 * org_admin: создать роль организации.
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

  const parsed = CreateBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: formatValidationError(parsed.error) }, { status: 400 });
  }

  const { slug, title, domainRole, platforms } = parsed.data;
  const slugNorm = slug.trim().toLowerCase();
  if (await systemRoleSlugExists(slugNorm)) {
    return NextResponse.json({ error: 'Роль с таким slug уже существует' }, { status: 409 });
  }

  const row = await createOrgRole(auth.ctx.organizationId, {
    domainRole,
    platforms,
    slug: slugNorm,
    title,
  });
  if (!row) {
    return NextResponse.json({ error: 'Не удалось создать роль' }, { status: 409 });
  }

  return NextResponse.json(
    { role: orgRoleToEntry(row) },
    { status: 201 }
  );
}
