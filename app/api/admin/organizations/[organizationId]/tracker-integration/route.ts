import {
  getTrackerIntegrationConfig,
  saveTrackerIntegrationConfig,
} from '@/lib/admin/adminTrackerIntegrationRouteHelpers';

/**
 * GET /api/admin/organizations/[organizationId]/tracker-integration
 * Полный конфиг интеграции для админ-формы.
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  return getTrackerIntegrationConfig(request, organizationId);
}

/**
 * PUT /api/admin/organizations/[organizationId]/tracker-integration
 * Заменяет `settings.trackerIntegration`, инкрементирует configRevision.
 */
export async function PUT(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  return saveTrackerIntegrationConfig(request, organizationId);
}
