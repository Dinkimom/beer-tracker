'use client';

import { useLayoutEffect, type ReactNode } from 'react';

import { PlannerTimelineScaleProvider } from '@/features/planner/PlannerTimelineScaleProvider';
import { MobxRootProvider } from '@/lib/layers';
import { setPlannerBeerTrackerApiOverride } from '@/lib/plannerBeerTrackerApiOverride';
import { setPlannerNowOverride } from '@/utils/plannerClock';

export default function MainLayout({ children }: Readonly<{ children: ReactNode }>) {
  useLayoutEffect(() => {
    // If HMR / soft-nav left the demo fixture client stuck, real planner must not use it.
    setPlannerBeerTrackerApiOverride(null);
    setPlannerNowOverride(null);
  }, []);

  return (
    <MobxRootProvider>
      <PlannerTimelineScaleProvider>{children}</PlannerTimelineScaleProvider>
    </MobxRootProvider>
  );
}
