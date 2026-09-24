'use client';

import type { PlannerOnboardingStep } from '@/lib/plannerOnboarding/plannerOnboarding';
import type { CSSProperties } from 'react';

import { Icon } from '@/components/Icon';
import { CARD_MARGIN, ZIndex, getPartsPerDay } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { resolveSwimlaneOneCardHeightPx } from '@/features/swimlane/utils/swimlaneRowReservedLayers';
import { SWIMLANE_TASK_ROW_VERTICAL_INSET_PX } from '@/features/swimlane/utils/taskLayerTaskLayout';
import {
  PLANNER_ONBOARDING_STEPS,
  plannerOnboardingCalloutSide,
} from '@/lib/plannerOnboarding/plannerOnboarding';

import {
  placePlannerOnboardingCallout,
  resolvePlannerOnboardingGhostRect,
  type RectBox,
} from './plannerOnboardingGeometry';
import { PlannerOnboardingPopover } from './PlannerOnboardingPopover';

const CALLOUT_SIZE = { height: 196, width: 320 };
const HOLE_PAD_PX = 6;

const FIRST_LANE_SELECTOR = '[data-swimlane]:not([data-team-swimlane="true"])';

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
  cardRect,
  laneRect,
  showGhost,
  sprintTimelineWorkingDays,
  step,
  stepIndex,
  viewMode,
  onComplete,
  onNext,
  onPlaceFirstTask,
}: {
  anchorRect: RectBox | null;
  cardRect: RectBox | null;
  laneRect: RectBox | null;
  onComplete: () => void;
  onNext: () => void;
  onPlaceFirstTask: (assigneeId: string) => void;
  showGhost: boolean;
  sprintTimelineWorkingDays: number;
  step: PlannerOnboardingStep;
  stepIndex: number;
  viewMode: string;
}) {
  const { t } = useI18n();
  const ghostRect = resolveTourGhostRect(showGhost, laneRect, sprintTimelineWorkingDays);
  const hole = anchorRect ? inflateRect(anchorRect, HOLE_PAD_PX) : null;
  const callout = placePlannerOnboardingCallout(
    hole,
    plannerOnboardingCalloutSide(step),
    {
      height: typeof window === 'undefined' ? 800 : window.innerHeight,
      width: typeof window === 'undefined' ? 1200 : window.innerWidth,
    },
    CALLOUT_SIZE
  );
  const lastStep = stepIndex >= PLANNER_ONBOARDING_STEPS.length - 1;

  return (
    <div
      aria-labelledby="planner-onboarding-title"
      aria-modal="true"
      className="fixed inset-0"
      data-planner-onboarding-dialog="true"
      role="dialog"
      style={{ zIndex: ZIndex.overlay }}
    >
      {hole ? (
        <div
          className="pointer-events-none rounded-lg outline outline-2 outline-white/90"
          style={{
            ...fixedBoxStyle(hole),
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900/55" />
      )}
      <div className="absolute inset-0" />
      {cardRect ? (
        <div
          className="pointer-events-none rounded-lg outline outline-2 outline-blue-400"
          style={fixedBoxStyle(cardRect)}
        />
      ) : null}
      {ghostRect ? (
        <button
          aria-label={t('sprintPlanner.onboarding.placeFirst')}
          className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/90 px-2 text-sm font-medium text-blue-700 dark:border-blue-700 dark:bg-blue-950/80 dark:text-blue-200"
          style={{ ...fixedBoxStyle(ghostRect), zIndex: 1 }}
          type="button"
          onClick={() => placeFirstOnboardingTask(onComplete, onPlaceFirstTask)}
        >
          <Icon className="h-4 w-4 shrink-0" name="plus" />
          <span className="truncate">{t('sprintPlanner.swimlane.quickAddPreviewTitle')}</span>
        </button>
      ) : null}
      <div className="fixed" style={{ left: callout.left, top: callout.top, zIndex: 2 }}>
        <PlannerOnboardingPopover
          body={resolveTourBody(step, viewMode, ghostRect != null, t)}
          focusToken={step}
          primaryLabel={t(lastStep ? 'sprintPlanner.onboarding.done' : 'sprintPlanner.onboarding.next')}
          progress={t('sprintPlanner.onboarding.progress', {
            current: stepIndex + 1,
            total: PLANNER_ONBOARDING_STEPS.length,
          })}
          secondaryLabel={t('sprintPlanner.onboarding.skip')}
          title={resolveTourTitle(step, viewMode, t)}
          onPrimary={onNext}
          onSecondary={onComplete}
        />
      </div>
    </div>
  );
}

function resolveTourGhostRect(
  showGhost: boolean,
  laneRect: RectBox | null,
  sprintTimelineWorkingDays: number
): RectBox | null {
  if (!showGhost || laneRect == null) {
    return null;
  }
  return resolvePlannerOnboardingGhostRect(laneRect, {
    cardHeightPx: resolveSwimlaneOneCardHeightPx(false),
    insetPx: SWIMLANE_TASK_ROW_VERTICAL_INSET_PX,
    marginPx: CARD_MARGIN,
    slotCount: Math.max(1, sprintTimelineWorkingDays) * getPartsPerDay(),
  });
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
  showEmptyGhost: boolean,
  t: (key: string) => string
): string {
  if (step === 'lane' && viewMode === 'features') {
    return t('sprintPlanner.onboarding.steps.laneBodyFeatures');
  }
  if (step === 'tools' && showEmptyGhost) {
    return t('sprintPlanner.onboarding.steps.toolsBodyEmpty');
  }
  return t(`sprintPlanner.onboarding.steps.${step}Body`);
}

function placeFirstOnboardingTask(
  onComplete: () => void,
  onPlaceFirstTask: (assigneeId: string) => void
): void {
  const lane = document.querySelector(FIRST_LANE_SELECTOR);
  const assigneeId = lane instanceof HTMLElement ? lane.dataset.swimlane : undefined;
  if (!assigneeId) {
    onComplete();
    return;
  }
  onPlaceFirstTask(assigneeId);
  onComplete();
}
