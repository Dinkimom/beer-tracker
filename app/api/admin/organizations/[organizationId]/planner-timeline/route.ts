import { NextResponse } from 'next/server';

import { parseAdminOrgJsonBody } from '@/lib/admin/adminOrgSyncActionHelpers';
import {
  getPlannerTimelineScaleForAdmin,
  patchPlannerTimelineScale,
} from '@/lib/admin/plannerTimelineScaleRouteHelpers';
import { PlannerTimelineScalePatchSchema } from '@/lib/plannerTimelineScale';

/**
 * GET /api/admin/organizations/[organizationId]/planner-timeline
 * Текущая сетка дня и единица оценки.
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  return getPlannerTimelineScaleForAdmin(request, organizationId);
}

/**
 * PATCH /api/admin/organizations/[organizationId]/planner-timeline
 * Смена единицы оценки не двигает карточки. Смена числа слотов в дне пересчитывает геометрию.
 */
export async function PATCH(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const parsed = await parseAdminOrgJsonBody(
    request,
    PlannerTimelineScalePatchSchema,
    'Некорректные поля сетки планера'
  );
  if (parsed instanceof NextResponse) return parsed;
  return patchPlannerTimelineScale(request, organizationId, parsed);
}
