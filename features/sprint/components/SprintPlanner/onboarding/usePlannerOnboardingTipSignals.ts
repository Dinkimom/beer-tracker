'use client';

import type { PlannerOnboardingTipSignals } from '@/lib/plannerOnboarding/plannerOnboarding';

import { useEffect, useState } from 'react';

import { useRootStore } from '@/lib/layers';

export function usePlannerOnboardingTipSignals(input: {
  open: boolean;
  tourCompleted: boolean;
  viewMode: string;
}): PlannerOnboardingTipSignals {
  const { sprintPlannerUi } = useRootStore();
  const tipsEnabled = input.tourCompleted && !input.open;
  const [layersLatched, setLayersLatched] = useState(false);

  useEffect(() => {
    if (!tipsEnabled) {
      return;
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-onboarding="layers"]')) {
        setLayersLatched(true);
      }
    };
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
    };
  }, [tipsEnabled]);

  return {
    featuresView: input.viewMode === 'features',
    layers: layersLatched,
    link: sprintPlannerUi.placementTool === 'link',
    taskTool: sprintPlannerUi.placementTool === 'task',
  };
}
