'use client';

import type { ReactNode } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';
import { fetchPlannerTimelineScale } from '@/lib/api/plannerTimeline';
import {
  DEFAULT_PLANNER_TIMELINE_SCALE,
  setActivePlannerTimelineScale,
} from '@/lib/plannerTimelineScale';

/** Подставляет сетку и шкалу оценок активной организации в расчёты планера. */
export function PlannerTimelineScaleProvider({ children }: { children: ReactNode }) {
  const { activeOrganizationId } = useProductTenantOrganizations({ pollIntervalMs: 0 });
  const { data } = useQuery({
    enabled: Boolean(activeOrganizationId),
    queryFn: () => fetchPlannerTimelineScale(activeOrganizationId!),
    queryKey: ['planner-timeline-scale', activeOrganizationId],
    staleTime: 60_000,
  });
  const scale = data ?? DEFAULT_PLANNER_TIMELINE_SCALE;
  setActivePlannerTimelineScale(scale);
  useEffect(() => () => setActivePlannerTimelineScale(DEFAULT_PLANNER_TIMELINE_SCALE), []);
  return children;
}
