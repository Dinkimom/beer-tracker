import { NextResponse } from 'next/server';

import { requireTenantWithPlannerProfile } from '@/lib/api-tenant';
import { findOrganizationById } from '@/lib/organizations';
import { readPlannerTimelineScale } from '@/lib/plannerTimelineScale';

/**
 * GET /api/organizations/[organizationId]/planner-timeline
 * Сетка дня и единица оценки для планера. Секретов нет.
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const auth = await requireTenantWithPlannerProfile(request, organizationId);
  if ('response' in auth) return auth.response;

  const org = await findOrganizationById(auth.ctx.organizationId);
  if (!org) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }
  return NextResponse.json(readPlannerTimelineScale(org.settings));
}
