import { NextResponse } from 'next/server';

import { requireAdminOrganization } from '@/lib/admin/adminOrgSyncActionHelpers';
import { findOrganizationById } from '@/lib/organizations';
import {
  applyPlannerTimelineScale,
  plannerGridPreviewHasRows,
  previewPlannerGridMigration,
} from '@/lib/planner/migrateOrganizationPlannerGrid';
import {
  plannerTimelineScaleFromPatch,
  plannerTimelineScalesEqual,
  readPlannerTimelineScale,
  type PlannerTimelineScalePatch,
} from '@/lib/plannerTimelineScale';

export async function getPlannerTimelineScaleForAdmin(
  request: Request,
  organizationId: string
): Promise<NextResponse> {
  const authResult = await requireAdminOrganization(request, organizationId);
  if (authResult instanceof NextResponse) return authResult;
  return NextResponse.json(readPlannerTimelineScale(authResult.org.settings));
}

export async function patchPlannerTimelineScale(
  request: Request,
  organizationId: string,
  patch: PlannerTimelineScalePatch
): Promise<NextResponse> {
  const authResult = await requireAdminOrganization(request, organizationId);
  if (authResult instanceof NextResponse) return authResult;
  const org = await findOrganizationById(authResult.org.id);
  if (!org) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }
  const current = readPlannerTimelineScale(org.settings);
  const next = plannerTimelineScaleFromPatch(patch);
  if (plannerTimelineScalesEqual(current, next)) {
    return NextResponse.json(current);
  }
  if (current.timeslotsPerDay !== next.timeslotsPerDay) {
    const preview = await previewPlannerGridMigration(
      org.id,
      current.timeslotsPerDay,
      next.timeslotsPerDay
    );
    if (plannerGridPreviewHasRows(preview) && patch.confirmGridMigration !== true) {
      return NextResponse.json(
        {
          code: 'GRID_MIGRATION_REQUIRED',
          error: 'Смена числа таймслотов пересчитает уже распланированные карточки',
          preview,
        },
        { status: 409 }
      );
    }
  }
  await applyPlannerTimelineScale(org.id, org.settings, next, current.timeslotsPerDay);
  return NextResponse.json(next);
}
