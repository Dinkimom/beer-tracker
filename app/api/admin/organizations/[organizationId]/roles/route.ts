import { NextResponse } from 'next/server';

import { requireTenantForOrganization } from '@/lib/api-tenant';
import { getEffectiveRoles } from '@/lib/roles/effectiveCatalog';
import { listOrgRoles } from '@/lib/roles/orgRolesRepository';
import { listSystemRoles } from '@/lib/roles/systemRolesRepository';

/**
 * GET /api/admin/organizations/[organizationId]/roles
 * Возвращает эффективный каталог: system_roles + org_roles организации.
 * Доступен любому аутентифицированному члену организации (не только org_admin).
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

  const [systemRows, orgRows] = await Promise.all([
    listSystemRoles(),
    listOrgRoles(organizationId),
  ]);
  const roles = getEffectiveRoles(systemRows, orgRows);

  return NextResponse.json({ roles });
}
