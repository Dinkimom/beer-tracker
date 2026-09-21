import type { TrackerIntegrationStored } from './schema';

import { getProductUserIdFromRequest } from '@/lib/auth/productSession';
import { findOrganizationMembership } from '@/lib/organizations/organizationMembersRepository';
import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';

import { loadTrackerIntegrationForTrackerPatch } from './loadForOrganization';

/**
 * Загружает конфиг интеграции, если в запросе есть заголовок tenant и сессия пользователя.
 */
export async function loadTrackerIntegrationForRequest(
  request: Request
): Promise<TrackerIntegrationStored | null> {
  const orgId = request.headers.get(TENANT_ORG_HEADER)?.trim();
  const userId = getProductUserIdFromRequest(request);
  if (!orgId || !userId) {
    return null;
  }
  const m = await findOrganizationMembership(orgId, userId);
  if (!m) {
    return null;
  }
  return loadTrackerIntegrationForTrackerPatch(orgId);
}
