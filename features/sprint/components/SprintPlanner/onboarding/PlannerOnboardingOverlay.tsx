'use client';

import type { PlannerOnboardingStep, PlannerOnboardingTip } from '@/lib/plannerOnboarding/plannerOnboarding';
import type { ReactNode } from 'react';

import { createPortal } from 'react-dom';

import { useI18n } from '@/contexts/LanguageContext';
import { resolvePlannerOnboardingTip } from '@/lib/plannerOnboarding/plannerOnboarding';

import { type PlannerOnboardingCalloutSide } from './plannerOnboardingGeometry';
import { PlannerOnboardingTipLayer } from './PlannerOnboardingTipLayer';
import { PlannerOnboardingTour } from './PlannerOnboardingTour';
import { PlannerOnboardingWelcome } from './PlannerOnboardingWelcome';
import { useOnboardingAnchorRect } from './useOnboardingAnchorRect';
import { useOnboardingTourRects } from './useOnboardingTourRects';
import { usePlannerOnboardingTipSignals } from './usePlannerOnboardingTipSignals';

const SELECTORS = {
  layers: '[data-onboarding="layers"]',
  link: '[data-onboarding-tool="link"]',
  task: '[data-onboarding-tool="task"]',
  viewMode: '[data-onboarding="view-mode"]',
} as const;

interface PlannerOnboardingOverlayProps {
  open: boolean;
  scrollContainerRef: { readonly current: HTMLElement | null };
  seenTips: readonly PlannerOnboardingTip[];
  step: PlannerOnboardingStep;
  stepIndex: number;
  tourCompleted: boolean;
  viewMode: string;
  welcome: boolean;
  onComplete: () => void;
  onDismissTip: (tip: PlannerOnboardingTip) => void;
  onNext: () => void;
  onStart: () => void;
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

export function PlannerOnboardingOverlay(props: PlannerOnboardingOverlayProps) {
  const { t } = useI18n();
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
  const anchorRect = useOnboardingTourRects({
    open: props.open,
    scrollContainerRef: props.scrollContainerRef,
    step: props.step,
  });
  const tipRect = useOnboardingAnchorRect({
    active: tip != null,
    scrollContainerRef: props.scrollContainerRef,
    selector: tip ? plannerOnboardingTipSelector(tip) : null,
  });

  if (props.welcome) {
    return <PlannerOnboardingWelcome onSkip={props.onComplete} onStart={props.onStart} />;
  }
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
      step={props.step}
      stepIndex={props.stepIndex}
      viewMode={props.viewMode}
      onComplete={props.onComplete}
      onNext={props.onNext}
    />
  );
}

function portalOnboarding(node: ReactNode): ReactNode {
  if (typeof document === 'undefined') {
    return null;
  }
  return createPortal(node, document.body);
}
