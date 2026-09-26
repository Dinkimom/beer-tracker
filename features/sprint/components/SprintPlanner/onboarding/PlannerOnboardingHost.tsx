'use client';

import type { BoardViewMode } from '@/hooks/useLocalStorage';
import type { ReactNode } from 'react';

import { getPartsPerDay } from '@/constants';
import { useRegisterPlannerOnboardingReplay } from '@/contexts/PlannerOnboardingReplayBridge';
import { ONBOARDING_DRAG_SHIFT_PARTS } from '@/lib/plannerOnboarding/onboardingDemoLane';
import {
  PLANNER_ONBOARDING_ENABLED,
  isPlannerOnboardingSurface,
} from '@/lib/plannerOnboarding/plannerOnboarding';

import { PlannerOnboardingChromeProvider } from './plannerOnboardingChrome';
import { PlannerOnboardingOverlay } from './PlannerOnboardingOverlay';
import { useOnboardingAssigneeShift } from './useOnboardingAssigneeShift';
import { useOnboardingDemoContextMenu } from './useOnboardingDemoContextMenu';
import { useOnboardingResizePulse } from './useOnboardingResizePulse';
import { usePlannerOnboarding } from './usePlannerOnboarding';

function resolveOnboardingSampleDuration(
  rowVisible: boolean,
  partsPerDay: number,
  grown: boolean
): number | null {
  if (!rowVisible) {
    return null;
  }
  return grown ? partsPerDay + 1 : partsPerDay;
}

interface PlannerOnboardingHostProps {
  children: ReactNode;
  scrollContainerRef: { readonly current: HTMLElement | null };
  selectedSprintId: number | null;
  tasksLoading: boolean;
  viewMode: BoardViewMode;
  setViewMode: (value: BoardViewMode | ((prev: BoardViewMode) => BoardViewMode)) => void;
}

export function PlannerOnboardingHost({
  children,
  scrollContainerRef,
  selectedSprintId,
  setViewMode,
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

  const rowVisible = onboarding.open;
  const assigneesStep = onboarding.open && onboarding.step === 'assignees';
  const linkStep = onboarding.open && onboarding.step === 'link';
  const resizeGrown = useOnboardingResizePulse(onboarding.open && onboarding.step === 'resize');
  const dragShifted = useOnboardingResizePulse(onboarding.open && onboarding.step === 'drag');
  const assigneeShifted = useOnboardingAssigneeShift(assigneesStep);
  useOnboardingDemoContextMenu(onboarding.open && onboarding.step === 'menu');
  const sampleDurationParts = resolveOnboardingSampleDuration(
    rowVisible,
    getPartsPerDay(),
    resizeGrown
  );
  useRegisterPlannerOnboardingReplay(PLANNER_ONBOARDING_ENABLED ? onboarding.replay : null);

  if (!PLANNER_ONBOARDING_ENABLED) {
    return children;
  }

  return (
    <PlannerOnboardingChromeProvider
      sampleAssigneeShift={assigneeShifted}
      sampleDragging={onboarding.open && (onboarding.step === 'drag' || assigneesStep)}
      sampleDurationParts={sampleDurationParts}
      sampleStartPart={dragShifted ? ONBOARDING_DRAG_SHIFT_PARTS : 0}
      showAssigneeRow={rowVisible}
      showDemoLink={linkStep}
      showResizeHandle={onboarding.open && onboarding.step === 'resize'}
      showSecondAssigneeRow={assigneesStep || linkStep}
      toolsEmphasis={onboarding.chrome.toolsEmphasis}
    >
      {children}
      <PlannerOnboardingOverlay
        open={onboarding.open}
        scrollContainerRef={scrollContainerRef}
        seenTips={onboarding.seenTips}
        step={onboarding.step}
        stepIndex={onboarding.stepIndex}
        tourCompleted={onboarding.tourCompleted}
        viewMode={viewMode}
        welcome={onboarding.welcome}
        onComplete={onboarding.completeTour}
        onDismissTip={onboarding.dismissTip}
        onNext={onboarding.nextStep}
        onStart={onboarding.startTour}
      />
    </PlannerOnboardingChromeProvider>
  );
}
