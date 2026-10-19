import { getOrgHolidayCountry, patchOrgHolidayCountry } from '@/lib/holidays/orgHolidayCountryRouteHelpers';

/**
 * GET /api/organizations/[organizationId]/holiday-country
 * Календарь праздников организации (для таймлайна и MCP capacity).
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  return getOrgHolidayCountry(request, organizationId);
}

/**
 * PATCH /api/organizations/[organizationId]/holiday-country
 * Body: { holidayCountry: 'ru' | … }. Доступно участникам с доступом к планеру.
 */
export async function PATCH(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  return patchOrgHolidayCountry(request, organizationId);
}
