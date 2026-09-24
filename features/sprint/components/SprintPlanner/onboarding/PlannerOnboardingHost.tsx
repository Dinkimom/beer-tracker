'use client';

import type { BoardViewMode } from '@/hooks/useLocalStorage';
import type { ReactNode } from 'react';

import {
  PLANNER_ONBOARDING_ENABLED,
  isPlannerOnboardingSurface,
  plannerBoardHasPlacedWork,
} from '@/lib/plannerOnboarding/plannerOnboarding';

import { PlannerOnboardingChromeProvider } from './plannerOnboardingChrome';
import { PlannerOnboardingOverlay } from './PlannerOnboardingOverlay';
import { usePlannerOnboarding } from './usePlannerOnboarding';

interface PlannerOnboardingHostProps {
  children: ReactNode;
  scrollContainerRef: { readonly current: HTMLElement | null };
  selectedSprintId: number | null;
  sprintTimelineWorkingDays: number;
  taskPositions: ReadonlyMap<string, unknown> | null | undefined;
  tasksLoading: boolean;
  viewMode: BoardViewMode;
  onPlaceFirstTask: (input: { assigneeId: string; day: number; part: number }) => void;
  setViewMode: (value: BoardViewMode | ((prev: BoardViewMode) => BoardViewMode)) => void;
}

export function PlannerOnboardingHost({
  children,
  onPlaceFirstTask,
  scrollContainerRef,
  selectedSprintId,
  setViewMode,
  sprintTimelineWorkingDays,
  taskPositions,
  tasksLoading,
  viewMode,
}: PlannerOnboardingHostProps) {
  const onboarding = usePlannerOnboarding({
    enabled:
      PLANNER_ONBOARDING_ENABLED &&
      selectedSprintId != null &&
      !tasksLoading &&
      isPlannerOnboardingSurface(viewMode),
    setViewMode,
    viewMode,
  });

  if (!PLANNER_ONBOARDING_ENABLED) {
    return children;
  }

  return (
    <PlannerOnboardingChromeProvider replay={onboarding.replay} toolsEmphasis={onboarding.chrome.toolsEmphasis}>
      {children}
      <PlannerOnboardingOverlay
        boardHasPlacedWork={plannerBoardHasPlacedWork(taskPositions)}
        open={onboarding.open}
        scrollContainerRef={scrollContainerRef}
        seenTips={onboarding.seenTips}
        sprintTimelineWorkingDays={sprintTimelineWorkingDays}
        step={onboarding.step}
        stepIndex={onboarding.stepIndex}
        tourCompleted={onboarding.tourCompleted}
        viewMode={viewMode}
        onComplete={onboarding.completeTour}
        onDismissTip={onboarding.dismissTip}
        onNext={onboarding.nextStep}
        onPlaceFirstTask={onPlaceFirstTask}
      />
    </PlannerOnboardingChromeProvider>
  );
}
