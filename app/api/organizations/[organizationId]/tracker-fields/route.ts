import { NextResponse } from 'next/server';

import { requireTenantWithPlannerProfile } from '@/lib/api-tenant';
import { findOrganizationById } from '@/lib/organizations';
import { loadOrganizationTrackerFieldCatalog } from '@/lib/tracker/loadOrganizationTrackerFieldCatalog';

/**
 * GET /api/organizations/[organizationId]/tracker-fields
 * Каталог полей трекера для селекта карточки. Тот же источник, что админка.
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const auth = await requireTenantWithPlannerProfile(request, organizationId);
  if ('response' in auth) {
    return auth.response;
  }

  const org = await findOrganizationById(auth.ctx.organizationId);
  if (!org) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }

  const result = await loadOrganizationTrackerFieldCatalog(org);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ fields: result.fields });
}
