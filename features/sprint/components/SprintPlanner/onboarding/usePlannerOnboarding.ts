'use client';

import type { BoardViewMode } from '@/hooks/useLocalStorage';

import { useCallback, useMemo, useState } from 'react';

import { STORAGE_KEYS } from '@/hooks/localStorage/storageKeys';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  DEFAULT_PLANNER_ONBOARDING,
  PLANNER_ONBOARDING_STEPS,
  isPlannerOnboardingSurface,
  normalizePlannerOnboarding,
} from '@/lib/plannerOnboarding/plannerOnboarding';

type PlannerOnboardingSession = 'closed' | 'tour';

export function usePlannerOnboarding(input: {
  enabled: boolean;
  setViewMode: (value: BoardViewMode | ((prev: BoardViewMode) => BoardViewMode)) => void;
  viewMode: BoardViewMode;
}) {
  const { enabled, setViewMode, viewMode } = input;
  const [stored, setPersisted] = useLocalStorage(
    STORAGE_KEYS.PLANNER_ONBOARDING,
    DEFAULT_PLANNER_ONBOARDING
  );
  const state = normalizePlannerOnboarding(stored);
  const [session, setSession] = useState<PlannerOnboardingSession | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const surface = isPlannerOnboardingSurface(viewMode);
  const welcome = surface && session == null && enabled && !state.tourCompleted;
  const open = surface && session === 'tour';

  const completeTour = useCallback(() => {
    setSession('closed');
    setPersisted((prev) => ({
      ...normalizePlannerOnboarding(prev),
      tourCompleted: true,
    }));
  }, [setPersisted]);

  const nextStep = useCallback(() => {
    if (stepIndex >= PLANNER_ONBOARDING_STEPS.length - 1) {
      completeTour();
      return;
    }
    setStepIndex(stepIndex + 1);
  }, [completeTour, stepIndex]);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setSession('tour');
  }, []);

  const replay = useCallback(() => {
    if (!isPlannerOnboardingSurface(viewMode)) {
      setViewMode('full');
    }
    startTour();
  }, [setViewMode, startTour, viewMode]);

  const step = PLANNER_ONBOARDING_STEPS[stepIndex] ?? 'lane';
  const chrome = useMemo(() => ({ toolsEmphasis: false }), []);

  return {
    chrome,
    completeTour,
    nextStep,
    open,
    replay,
    startTour,
    step,
    stepIndex,
    tourCompleted: state.tourCompleted,
    welcome,
  };
}
