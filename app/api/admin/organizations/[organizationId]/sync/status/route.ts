import { getOrganizationSyncStatus } from '@/lib/admin/adminSyncStatusRouteHelpers';

/**
 * GET /api/admin/organizations/[organizationId]/sync/status
 * org_admin: Redis jobs + последний sync_run + текущий running (PG).
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  return getOrganizationSyncStatus(request, organizationId);
}
