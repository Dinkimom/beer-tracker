'use client';

import type { ReactNode } from 'react';

import { createContext, useContext, useMemo } from 'react';

interface PlannerOnboardingChrome {
  sampleAssigneeShift: boolean;
  sampleDragging: boolean;
  sampleDurationParts: number | null;
  sampleStartPart: number;
  showAssigneeRow: boolean;
  showDemoLink: boolean;
  showResizeHandle: boolean;
  showSecondAssigneeRow: boolean;
  toolsEmphasis: boolean;
}

const PlannerOnboardingChromeContext = createContext<PlannerOnboardingChrome>({
  sampleAssigneeShift: false,
  sampleDragging: false,
  sampleDurationParts: null,
  sampleStartPart: 0,
  showAssigneeRow: false,
  showDemoLink: false,
  showResizeHandle: false,
  showSecondAssigneeRow: false,
  toolsEmphasis: false,
});

const PlannerOnboardingReplayContext = createContext<(() => void) | null>(null);

export function PlannerOnboardingChromeProvider({
  children,
  replay,
  sampleAssigneeShift,
  sampleDragging,
  sampleDurationParts,
  sampleStartPart,
  showAssigneeRow,
  showDemoLink,
  showResizeHandle,
  showSecondAssigneeRow,
  toolsEmphasis,
}: {
  children: ReactNode;
  replay: () => void;
  sampleAssigneeShift: boolean;
  sampleDragging: boolean;
  sampleDurationParts: number | null;
  sampleStartPart: number;
  showAssigneeRow: boolean;
  showDemoLink: boolean;
  showResizeHandle: boolean;
  showSecondAssigneeRow: boolean;
  toolsEmphasis: boolean;
}) {
  const chrome = useMemo(
    () => ({
      sampleAssigneeShift,
      sampleDragging,
      sampleDurationParts,
      sampleStartPart,
      showAssigneeRow,
      showDemoLink,
      showResizeHandle,
      showSecondAssigneeRow,
      toolsEmphasis,
    }),
    [
      sampleAssigneeShift,
      sampleDragging,
      sampleDurationParts,
      sampleStartPart,
      showAssigneeRow,
      showDemoLink,
      showResizeHandle,
      showSecondAssigneeRow,
      toolsEmphasis,
    ]
  );
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
