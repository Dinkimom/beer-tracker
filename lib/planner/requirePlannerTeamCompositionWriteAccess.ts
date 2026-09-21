import { NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';
import {
  TrackerApiConfigError,
  verifyTrackerAccessForOrganization,
} from '@/lib/trackerRequestConfig';

import {
  type PlannerTeamCompositionWriteAccessResult,
  resolveOrganizationIdWhenTenantContextMissing,
} from './requirePlannerTeamCompositionWriteAccessHelpers';

/**
 * Доступ к изменению состава команды доски в планере: валидный OAuth-токен трекера
 * (заголовок X-Tracker-Token или org-токен on-prem) для организации tenant.
 * Сессия продукта и роли org_admin/тимлид не требуются.
 */
export async function requirePlannerTeamCompositionWriteAccess(
  request: Request
): Promise<PlannerTeamCompositionWriteAccessResult> {
  const tenant = await requireTenantContext(request);
  const organizationId =
    'ctx' in tenant
      ? tenant.ctx.organizationId
      : await resolveOrganizationIdFromRequest(request);

  if (typeof organizationId !== 'string') {
    return organizationId;
  }

  try {
    await verifyTrackerAccessForOrganization(request, organizationId);
    return { organizationId };
  } catch (error) {
    if (error instanceof TrackerApiConfigError) {
      return { response: NextResponse.json({ error: error.message }, { status: error.status }) };
    }
    throw error;
  }
}

async function resolveOrganizationIdFromRequest(
  request: Request
): Promise<PlannerTeamCompositionWriteAccessResult | string> {
  const resolved = await resolveOrganizationIdWhenTenantContextMissing(
    request.headers.get(TENANT_ORG_HEADER)
  );
  if ('response' in resolved) {
    return resolved;
  }
  return resolved.organizationId;
}
