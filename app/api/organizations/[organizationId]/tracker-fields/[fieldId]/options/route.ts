import { NextResponse } from 'next/server';

import { requireTenantWithPlannerProfile } from '@/lib/api-tenant';
import { findOrganizationById } from '@/lib/organizations';
import { loadOrganizationTrackerFieldOptions } from '@/lib/tracker/loadOrganizationTrackerFieldCatalog';

/**
 * GET /api/organizations/[organizationId]/tracker-fields/[fieldId]/options
 * Фиксированные значения поля-списка для коротких подписей на карточке.
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ fieldId: string; organizationId: string }> }
) {
  const { fieldId, organizationId } = await routeContext.params;
  const auth = await requireTenantWithPlannerProfile(request, organizationId);
  if ('response' in auth) {
    return auth.response;
  }

  const org = await findOrganizationById(auth.ctx.organizationId);
  if (!org) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }

  const result = await loadOrganizationTrackerFieldOptions(org, fieldId);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ values: result.values });
}
