import { NextResponse } from 'next/server';

import { requireTenantWithPlannerProfile } from '@/lib/api-tenant';
import { findOrganizationById } from '@/lib/organizations';
import {
  extractTrackerIntegrationJson,
  parseTrackerIntegrationStored,
  toPlannerIntegrationRulesDto,
} from '@/lib/trackerIntegration';

/**
 * GET /api/organizations/[organizationId]/planner-integration-rules
 * Публичные правила планера (без секретов). Доступ: org_admin или пользователь с командой в org (см. {@link requireTenantWithPlannerProfile}).
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

  const parsed = parseTrackerIntegrationStored(extractTrackerIntegrationJson(org.settings));
  return NextResponse.json(toPlannerIntegrationRulesDto(parsed));
}
