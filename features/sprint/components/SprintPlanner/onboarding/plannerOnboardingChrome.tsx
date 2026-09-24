'use client';

import type { ReactNode } from 'react';

import { createContext, useContext, useMemo } from 'react';

interface PlannerOnboardingChrome {
  toolsEmphasis: boolean;
}

const PlannerOnboardingChromeContext = createContext<PlannerOnboardingChrome>({
  toolsEmphasis: false,
});

const PlannerOnboardingReplayContext = createContext<(() => void) | null>(null);

export function PlannerOnboardingChromeProvider({
  children,
  replay,
  toolsEmphasis,
}: {
  children: ReactNode;
  replay: () => void;
  toolsEmphasis: boolean;
}) {
  const chrome = useMemo(() => ({ toolsEmphasis }), [toolsEmphasis]);
  return (
    <PlannerOnboardingReplayContext.Provider value={replay}>
      <PlannerOnboardingChromeContext.Provider value={chrome}>
        {children}
      </PlannerOnboardingChromeContext.Provider>
    </PlannerOnboardingReplayContext.Provider>
  );
}

export function usePlannerOnboardingChrome(): PlannerOnboardingChrome {
  return useContext(PlannerOnboardingChromeContext);
}

export function usePlannerOnboardingReplay(): (() => void) | null {
  return useContext(PlannerOnboardingReplayContext);
}

export function plannerOnboardingToolChromeClass(toolsEmphasis: boolean, tool: string): string {
  if (!toolsEmphasis) {
    return '';
  }
  if (tool === 'cursor' || tool === 'task') {
    return 'ring-2 ring-blue-500';
  }
  return 'opacity-40';
}
