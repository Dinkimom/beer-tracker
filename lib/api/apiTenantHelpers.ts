import type { RequirePlannerTenantResult, TenantContext } from '../api-tenant';

import { NextResponse } from 'next/server';

import { resolveAccessProfile } from '@/lib/access/orgAccess';
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
 * Tenant планера: org из заголовка (если есть в БД) или первая организация; дальше нужна сессия
 * и членство в этой организации (суперадмин продукта — как org_admin). Роль — из членства.
 */
export async function resolveOnPremTenantContext(
  request: Request
): Promise<RequirePlannerTenantResult> {
  const userId = getProductUserIdFromRequest(request);
  if (!userId) {
    return { response: NextResponse.json({ error: 'Требуется вход' }, { status: 401 }) };
  }
  const organizationId = await resolveOnPremOrganizationId(request);
  if (!organizationId) {
    return {
      response: NextResponse.json({ error: 'Организация не найдена' }, { status: 503 }),
    };
  }
  const profile = await resolveAccessProfile(userId, organizationId);
  if (!profile) {
    return { response: NextResponse.json({ error: 'Нет доступа к организации' }, { status: 403 }) };
  }
  const ctx: TenantContext = { organizationId, role: profile.orgRole, userId };
  return { ctx, profile };
}
