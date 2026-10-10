'use client';

import type { PlannerOnboardingStep } from '@/lib/plannerOnboarding/plannerOnboarding';
import type { ReactNode } from 'react';

import { createPortal } from 'react-dom';

import { PlannerOnboardingTour } from './PlannerOnboardingTour';
import { PlannerOnboardingWelcome } from './PlannerOnboardingWelcome';
import { useOnboardingTourRects } from './useOnboardingTourRects';

interface PlannerOnboardingOverlayProps {
  open: boolean;
  scrollContainerRef: { readonly current: HTMLElement | null };
  step: PlannerOnboardingStep;
  stepIndex: number;
  viewMode: string;
  welcome: boolean;
  onComplete: () => void;
  onNext: () => void;
  onStart: () => void;
}

export function PlannerOnboardingOverlay(props: PlannerOnboardingOverlayProps) {
  const anchorRect = useOnboardingTourRects({
    open: props.open,
    scrollContainerRef: props.scrollContainerRef,
    step: props.step,
  });

  if (props.welcome) {
    return <PlannerOnboardingWelcome onSkip={props.onComplete} onStart={props.onStart} />;
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
