import type { PlannerTimelineScale } from '@/lib/plannerTimelineScale';

import { adminOrgApiPath } from '@/lib/api/admin/paths';
import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';
import { DEFAULT_PLANNER_TIMELINE_SCALE, readPlannerTimelineScale } from '@/lib/plannerTimelineScale';

export interface PlannerGridMigrationPreview {
  comments: number;
  commentsShifted: number;
  positions: number;
  positionsShifted: number;
  segments: number;
  segmentsShifted: number;
}

function parsePlannerTimelineScale(raw: unknown): PlannerTimelineScale {
  if (raw === null || typeof raw !== 'object') return DEFAULT_PLANNER_TIMELINE_SCALE;
  return readPlannerTimelineScale({ planner: raw });
}

export async function fetchPlannerTimelineScale(organizationId: string): Promise<PlannerTimelineScale> {
  const { data } = await getPlannerBeerTrackerApi().get<unknown>(
    `/organizations/${organizationId}/planner-timeline`
  );
  return parsePlannerTimelineScale(data);
}

export async function fetchAdminPlannerTimelineScale(organizationId: string): Promise<PlannerTimelineScale> {
  const { data } = await getPlannerBeerTrackerApi().get<unknown>(
    adminOrgApiPath(organizationId, 'planner-timeline')
  );
  return parsePlannerTimelineScale(data);
}

export async function patchAdminPlannerTimelineScale(
  organizationId: string,
  body: PlannerTimelineScale & { confirmGridMigration?: boolean }
): Promise<PlannerTimelineScale> {
  const { data } = await getPlannerBeerTrackerApi().patch<unknown>(
    adminOrgApiPath(organizationId, 'planner-timeline'),
    body
  );
  return parsePlannerTimelineScale(data);
}
