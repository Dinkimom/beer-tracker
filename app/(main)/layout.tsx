'use client';

import { PlannerTimelineScaleProvider } from '@/features/planner/PlannerTimelineScaleProvider';
import { MobxRootProvider } from '@/lib/layers';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <MobxRootProvider>
      <PlannerTimelineScaleProvider>{children}</PlannerTimelineScaleProvider>
    </MobxRootProvider>
  );
}
