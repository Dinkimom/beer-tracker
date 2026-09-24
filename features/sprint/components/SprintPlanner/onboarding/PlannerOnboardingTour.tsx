'use client';

import type { PlannerOnboardingStep } from '@/lib/plannerOnboarding/plannerOnboarding';
import type { CSSProperties } from 'react';

import { useEffect } from 'react';

import { OVERLAY_BACKDROP_ENTER, OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { useDeferredOverlayClose } from '@/hooks/useOverlayPresence';
import {
  PLANNER_ONBOARDING_STEPS,
  plannerOnboardingCalloutSide,
} from '@/lib/plannerOnboarding/plannerOnboarding';

import {
  placePlannerOnboardingCallout,
  resolveOnboardingMenuCalloutSide,
  type RectBox,
} from './plannerOnboardingGeometry';
import { PlannerOnboardingPopover } from './PlannerOnboardingPopover';
import { PlannerOnboardingScrim } from './PlannerOnboardingScrim';

const CALLOUT_SIZE = { height: 196, width: 320 };
const HOLE_PAD_PX = 6;

function fixedBoxStyle(rect: RectBox): CSSProperties {
  return {
    height: rect.height,
    left: rect.left,
    position: 'fixed',
    top: rect.top,
    width: rect.width,
  };
}

function inflateRect(rect: RectBox, pad: number): RectBox {
  return {
    height: rect.height + pad * 2,
    left: rect.left - pad,
    top: rect.top - pad,
    width: rect.width + pad * 2,
  };
}

export function PlannerOnboardingTour({
  anchorRect,
  step,
  stepIndex,
  viewMode,
  onComplete,
  onNext,
}: {
  anchorRect: RectBox | null;
  onComplete: () => void;
  onNext: () => void;
  step: PlannerOnboardingStep;
  stepIndex: number;
  viewMode: string;
}) {
  const { t } = useI18n();
  const overlay = useDeferredOverlayClose(onComplete);
  const requestClose = overlay.requestClose;
  const hole = anchorRect ? inflateRect(anchorRect, HOLE_PAD_PX) : null;
  const holes = hole ? [hole] : [];
  const viewport = {
    height: typeof window === 'undefined' ? 800 : window.innerHeight,
    width: typeof window === 'undefined' ? 1200 : window.innerWidth,
  };
  const callout = placePlannerOnboardingCallout(
    hole,
    resolveTourCalloutSide(step, anchorRect, viewport.width),
    viewport,
    CALLOUT_SIZE
  );
  const lastStep = stepIndex >= PLANNER_ONBOARDING_STEPS.length - 1;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      requestClose();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [requestClose]);

  return (
    <div
      aria-labelledby="planner-onboarding-title"
      aria-modal="true"
      className="fixed inset-0"
      data-planner-onboarding-dialog="true"
      role="dialog"
      style={{ zIndex: ZIndex.overlay }}
    >
      <div
        className={`absolute inset-0 ${OVERLAY_BACKDROP_ENTER}`}
        data-state={overlay.state}
      >
        <PlannerOnboardingScrim holes={holes} />
        <div className="absolute inset-0" />
        {hole ? (
          <div
            className="pointer-events-none rounded-lg outline outline-2 outline-white/90"
            style={{ ...fixedBoxStyle(hole), zIndex: 2 }}
          />
        ) : null}
      </div>
      <div
        className={`fixed ${OVERLAY_PANEL_ENTER}`}
        data-state={overlay.state}
        style={{ left: callout.left, top: callout.top, zIndex: 3 }}
        onAnimationEnd={overlay.onAnimationEnd}
      >
        <PlannerOnboardingPopover
          body={resolveTourBody(step, viewMode, t)}
          focusToken={step}
          primaryLabel={t(lastStep ? 'sprintPlanner.onboarding.done' : 'sprintPlanner.onboarding.next')}
          progress={t('sprintPlanner.onboarding.progress', {
            current: stepIndex + 1,
            total: PLANNER_ONBOARDING_STEPS.length,
          })}
          secondaryLabel={t('sprintPlanner.onboarding.skip')}
          title={resolveTourTitle(step, viewMode, t)}
          onPrimary={onNext}
          onSecondary={requestClose}
        />
      </div>
    </div>
  );
}

function resolveTourCalloutSide(
  step: PlannerOnboardingStep,
  anchorRect: RectBox | null,
  viewportWidth: number
): 'below' | 'left' | 'right' {
  if (step === 'menu') {
    return resolveOnboardingMenuCalloutSide(anchorRect, viewportWidth, CALLOUT_SIZE.width);
  }
  return plannerOnboardingCalloutSide(step);
}

function resolveTourTitle(
  step: PlannerOnboardingStep,
  viewMode: string,
  t: (key: string) => string
): string {
  if (step === 'lane' && viewMode === 'features') {
    return t('sprintPlanner.onboarding.steps.laneTitleFeatures');
  }
  return t(`sprintPlanner.onboarding.steps.${step}Title`);
}

function resolveTourBody(
  step: PlannerOnboardingStep,
  viewMode: string,
  t: (key: string) => string
): string | undefined {
  if (step === 'menu') {
    return t('sprintPlanner.onboarding.steps.menuBody');
  }
  if (step === 'resize') {
    return t('sprintPlanner.onboarding.steps.resizeBody');
  }
  if (step === 'task' || step === 'drag' || step === 'assignees' || step === 'link') {
    return undefined;
  }
  if (step === 'lane' && viewMode === 'features') {
    return t('sprintPlanner.onboarding.steps.laneBodyFeatures');
  }
  return t(`sprintPlanner.onboarding.steps.${step}Body`);
}
