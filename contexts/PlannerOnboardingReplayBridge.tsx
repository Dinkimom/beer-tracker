'use client';

import type { ReactNode } from 'react';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type ReplayOnboarding = () => void;

interface PlannerOnboardingReplayBridgeValue {
  replay: ReplayOnboarding | null;
  register: (replay: ReplayOnboarding) => () => void;
}

const PlannerOnboardingReplayBridgeContext = createContext<PlannerOnboardingReplayBridgeValue>({
  register: () => () => {},
  replay: null,
});

export function PlannerOnboardingReplayBridge({ children }: { children: ReactNode }) {
  const [replay, setReplay] = useState<ReplayOnboarding | null>(null);
  const register = useCallback((next: ReplayOnboarding) => {
    setReplay(() => next);
    return () => {
      setReplay((current) => (current === next ? null : current));
    };
  }, []);
  const value = useMemo(() => ({ register, replay }), [register, replay]);

  return (
    <PlannerOnboardingReplayBridgeContext.Provider value={value}>
      {children}
    </PlannerOnboardingReplayBridgeContext.Provider>
  );
}

export function usePlannerOnboardingReplayAction(): ReplayOnboarding | null {
  return useContext(PlannerOnboardingReplayBridgeContext).replay;
}

export function useRegisterPlannerOnboardingReplay(replay: ReplayOnboarding | null) {
  const { register } = useContext(PlannerOnboardingReplayBridgeContext);
  useEffect(() => {
    if (!replay) {
      return;
    }
    return register(replay);
  }, [register, replay]);
}
