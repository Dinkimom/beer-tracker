'use client';

import type { PlannerOnboardingTipSignals } from '@/lib/plannerOnboarding/plannerOnboarding';

import { useEffect, useState } from 'react';

import { useRootStore } from '@/lib/layers';

export function usePlannerOnboardingTipSignals(input: {
  open: boolean;
  tourCompleted: boolean;
  viewMode: string;
}): PlannerOnboardingTipSignals & { resizeAnchor: HTMLElement | null } {
  const { sprintPlannerUi } = useRootStore();
  const tipsEnabled = input.tourCompleted && !input.open;
  const [layersLatched, setLayersLatched] = useState(false);
  const [resizeLatched, setResizeLatched] = useState(false);
  const [resizeAnchor, setResizeAnchor] = useState<HTMLElement | null>(null);

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
    const onOver = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const handle = target.closest('.task-bar-resize-handle-hit');
      if (handle instanceof HTMLElement) {
        setResizeAnchor(handle);
        setResizeLatched(true);
      }
    };
    document.addEventListener('click', onClick);
    document.addEventListener('pointerover', onOver);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('pointerover', onOver);
    };
  }, [tipsEnabled]);

  return {
    featuresView: input.viewMode === 'features',
    layers: layersLatched,
    link: sprintPlannerUi.placementTool === 'link',
    resize: resizeLatched,
    resizeAnchor,
    taskTool: sprintPlannerUi.placementTool === 'task',
  };
}
