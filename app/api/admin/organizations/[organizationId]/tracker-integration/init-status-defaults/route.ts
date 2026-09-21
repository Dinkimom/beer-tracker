import { initTrackerStatusDefaults } from '@/lib/admin/adminInitStatusDefaultsHelpers';

/**
 * POST /api/admin/organizations/[organizationId]/tracker-integration/init-status-defaults
 * Подмешивает эвристические defaultsByTrackerStatusType из GET /v3/statuses (существующие ключи не затираются).
 */
export async function POST(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  return initTrackerStatusDefaults(request, organizationId);
}
