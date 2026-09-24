'use client';

import type { PlannerOnboardingStep, PlannerOnboardingTip } from '@/lib/plannerOnboarding/plannerOnboarding';
import type { ReactNode } from 'react';

import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { useI18n } from '@/contexts/LanguageContext';
import { useRootStore } from '@/lib/layers';
import {
  plannerOnboardingAnchor,
  resolvePlannerOnboardingTip,
} from '@/lib/plannerOnboarding/plannerOnboarding';

import { type PlannerOnboardingCalloutSide } from './plannerOnboardingGeometry';
import { PlannerOnboardingTipLayer } from './PlannerOnboardingTipLayer';
import { PlannerOnboardingTour } from './PlannerOnboardingTour';
import { useOnboardingAnchorRect } from './useOnboardingAnchorRect';
import { usePlannerOnboardingTipSignals } from './usePlannerOnboardingTipSignals';

const SELECTORS = {
  card: '[data-onboarding-card]:not([data-task-id^="comment:"]):not([data-task-id^="local-task-"])',
  days: '[data-onboarding="days"]',
  firstLane: '[data-swimlane]:not([data-team-swimlane="true"])',
  lane: '[data-onboarding="lane"]',
  layers: '[data-onboarding="layers"]',
  link: '[data-onboarding-tool="link"]',
  task: '[data-onboarding-tool="task"]',
  toolbar: '[data-swimlane-placement-toolbar]',
  viewMode: '[data-onboarding="view-mode"]',
} as const;

const STEP_ANCHOR_SELECTOR = {
  days: SELECTORS.days,
  lane: SELECTORS.lane,
  toolbar: SELECTORS.toolbar,
} as const;

interface PlannerOnboardingOverlayProps {
  boardHasPlacedWork: boolean;
  open: boolean;
  scrollContainerRef: { readonly current: HTMLElement | null };
  seenTips: readonly PlannerOnboardingTip[];
  sprintTimelineWorkingDays: number;
  step: PlannerOnboardingStep;
  stepIndex: number;
  tourCompleted: boolean;
  viewMode: string;
  onComplete: () => void;
  onDismissTip: (tip: PlannerOnboardingTip) => void;
  onNext: () => void;
  onPlaceFirstTask: (input: { assigneeId: string; day: number; part: number }) => void;
}

function plannerOnboardingTipSelector(tip: PlannerOnboardingTip): string | null {
  if (tip === 'taskTool') {
    return SELECTORS.task;
  }
  if (tip === 'link') {
    return SELECTORS.link;
  }
  if (tip === 'featuresView') {
    return SELECTORS.viewMode;
  }
  if (tip === 'layers') {
    return SELECTORS.layers;
  }
  return null;
}

function plannerOnboardingTipSide(tip: PlannerOnboardingTip): PlannerOnboardingCalloutSide {
  if (tip === 'featuresView') {
    return 'below';
  }
  if (tip === 'layers') {
    return 'left';
  }
  return 'above';
}

function shouldShowOnboardingGhost(input: {
  boardHasPlacedWork: boolean;
  open: boolean;
  step: PlannerOnboardingStep;
  viewMode: string;
}): boolean {
  if (!input.open || input.step !== 'tools' || input.boardHasPlacedWork) {
    return false;
  }
  return input.viewMode === 'compact' || input.viewMode === 'full';
}

export const PlannerOnboardingOverlay = observer(function PlannerOnboardingOverlay(
  props: PlannerOnboardingOverlayProps
) {
  const { t } = useI18n();
  const { sprintPlannerUi } = useRootStore();
  const signals = usePlannerOnboardingTipSignals({
    open: props.open,
    tourCompleted: props.tourCompleted,
    viewMode: props.viewMode,
  });
  const tip = resolvePlannerOnboardingTip(
    props.tourCompleted && !props.open,
    props.seenTips,
    signals
  );
  const anchorName = props.open ? plannerOnboardingAnchor(props.step) : null;
  const showGhost = shouldShowOnboardingGhost(props);
  const anchorRect = useOnboardingAnchorRect({
    active: props.open,
    scrollContainerRef: props.scrollContainerRef,
    selector: anchorName ? STEP_ANCHOR_SELECTOR[anchorName] : null,
  });
  const laneRect = useOnboardingAnchorRect({
    active: showGhost,
    scrollContainerRef: props.scrollContainerRef,
    selector: showGhost ? SELECTORS.firstLane : null,
  });
  const cardRect = useOnboardingAnchorRect({
    active: props.open && props.step === 'span',
    scrollContainerRef: props.scrollContainerRef,
    selector: props.open && props.step === 'span' ? SELECTORS.card : null,
  });
  const tipRect = useOnboardingAnchorRect({
    active: tip != null,
    node: tip === 'resize' ? signals.resizeAnchor : null,
    scrollContainerRef: props.scrollContainerRef,
    selector: tip ? plannerOnboardingTipSelector(tip) : null,
  });

  const { onComplete, open } = props;
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onComplete();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onComplete, open]);

  if (tip && !props.open) {
    return portalOnboarding(
      <PlannerOnboardingTipLayer
        body={t(`sprintPlanner.onboarding.tips.${tip}`)}
        rect={tipRect}
        side={plannerOnboardingTipSide(tip)}
        onDismiss={() => props.onDismissTip(tip)}
      />
    );
  }
  if (!props.open) {
    return null;
  }
  return portalOnboarding(
    <PlannerOnboardingTour
      anchorRect={anchorRect}
      cardRect={cardRect}
      laneRect={laneRect}
      showGhost={showGhost}
      sprintTimelineWorkingDays={props.sprintTimelineWorkingDays}
      step={props.step}
      stepIndex={props.stepIndex}
      viewMode={props.viewMode}
      onComplete={props.onComplete}
      onNext={props.onNext}
      onPlaceFirstTask={(assigneeId) => {
        sprintPlannerUi.setPlacementTool('task');
        props.onPlaceFirstTask({ assigneeId, day: 0, part: 0 });
      }}
    />
  );
});

function portalOnboarding(node: ReactNode): ReactNode {
  if (typeof document === 'undefined') {
    return null;
  }
  return createPortal(node, document.body);
}
