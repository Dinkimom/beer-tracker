'use client';

import type { BoardViewMode } from '@/hooks/useLocalStorage';
import type { PlannerOnboardingTip } from '@/lib/plannerOnboarding/plannerOnboarding';

import { useCallback, useMemo, useState } from 'react';

import { STORAGE_KEYS } from '@/hooks/localStorage/storageKeys';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  DEFAULT_PLANNER_ONBOARDING,
  PLANNER_ONBOARDING_STEPS,
  isPlannerOnboardingSurface,
  normalizePlannerOnboarding,
  withPlannerOnboardingTipSeen,
} from '@/lib/plannerOnboarding/plannerOnboarding';

type PlannerOnboardingSession = 'closed' | 'open';

export function usePlannerOnboarding(input: {
  enabled: boolean;
  setViewMode: (value: BoardViewMode | ((prev: BoardViewMode) => BoardViewMode)) => void;
  viewMode: BoardViewMode;
}) {
  const { enabled, setViewMode, viewMode } = input;
  const [persisted, setPersisted] = useLocalStorage(
    STORAGE_KEYS.PLANNER_ONBOARDING,
    DEFAULT_PLANNER_ONBOARDING
  );
  const state = normalizePlannerOnboarding(persisted);
  const [session, setSession] = useState<PlannerOnboardingSession | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const surface = isPlannerOnboardingSurface(viewMode);
  const open =
    surface &&
    (session === 'open' || (session == null && enabled && !state.tourCompleted));

  const completeTour = useCallback(() => {
    setSession('closed');
    setPersisted((prev) => {
      const current = normalizePlannerOnboarding(prev);
      const next =
        viewMode === 'features'
          ? withPlannerOnboardingTipSeen(current, 'featuresView')
          : current;
      return { ...next, tourCompleted: true };
    });
  }, [setPersisted, viewMode]);

  const nextStep = useCallback(() => {
    if (stepIndex >= PLANNER_ONBOARDING_STEPS.length - 1) {
      completeTour();
      return;
    }
    setStepIndex(stepIndex + 1);
  }, [completeTour, stepIndex]);

  const replay = useCallback(() => {
    if (!isPlannerOnboardingSurface(viewMode)) {
      setViewMode('full');
    }
    setStepIndex(0);
    setSession('open');
  }, [setViewMode, viewMode]);

  const dismissTip = useCallback(
    (tip: PlannerOnboardingTip) => {
      setPersisted((prev) =>
        withPlannerOnboardingTipSeen(normalizePlannerOnboarding(prev), tip)
      );
    },
    [setPersisted]
  );

  const step = PLANNER_ONBOARDING_STEPS[stepIndex] ?? 'lane';
  const toolsEmphasis = open && step === 'tools';
  const chrome = useMemo(() => ({ toolsEmphasis }), [toolsEmphasis]);

  return {
    chrome,
    completeTour,
    dismissTip,
    nextStep,
    open,
    replay,
    seenTips: state.seenTips,
    step,
    stepIndex,
    tourCompleted: state.tourCompleted,
  };
}
