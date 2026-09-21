import type { RequirePlannerTenantResult, TenantContext } from '../api-tenant';
import type { AccessProfile } from '@/lib/access/orgAccess';

import { NextResponse } from 'next/server';

import { getProductUserIdFromRequest } from '@/lib/auth/productSession';
import { findOrganizationById, listAllOrganizationsAdminSummaries } from '@/lib/organizations/organizationRepository';
import { parseRegistryUuidString } from '@/lib/registryUuidString';
import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';

async function resolveOnPremOrganizationId(request: Request): Promise<string | null> {
  const fromHeader = parseRegistryUuidString(request.headers.get(TENANT_ORG_HEADER));
  if (fromHeader) {
    const org = await findOrganizationById(fromHeader);
    if (org) {
      return fromHeader;
    }
  }
  return (await listAllOrganizationsAdminSummaries())[0]?.organization_id ?? null;
}

/**
 * Tenant для on-prem: org из заголовка (если есть в БД) или первая организация.
 */
export async function resolveOnPremTenantContext(
  request: Request
): Promise<RequirePlannerTenantResult> {
  const organizationId = await resolveOnPremOrganizationId(request);
  if (!organizationId) {
    return {
      response: NextResponse.json({ error: 'Организация не найдена' }, { status: 503 }),
    };
  }
  const userId = getProductUserIdFromRequest(request) ?? 'onprem-anonymous';
  const ctx: TenantContext = { organizationId, role: 'org_admin', userId };
  const profile: AccessProfile = {
    organizationId,
    orgRole: 'org_admin',
    teamMemberships: [],
    userId,
  };
  return { ctx, profile };
}
