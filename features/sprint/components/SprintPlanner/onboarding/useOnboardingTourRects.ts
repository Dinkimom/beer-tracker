'use client';

import type { RectBox } from './plannerOnboardingGeometry';
import type { PlannerOnboardingStep } from '@/lib/plannerOnboarding/plannerOnboarding';

import { ONBOARDING_SAMPLE_TASK_ID } from '@/lib/plannerOnboarding/onboardingDemoLane';
import { plannerOnboardingAnchor } from '@/lib/plannerOnboarding/plannerOnboarding';

import { unionOnboardingRects } from './plannerOnboardingGeometry';
import { useOnboardingAnchorRect } from './useOnboardingAnchorRect';
import { useOnboardingScene } from './useOnboardingScene';

const PIVCHIK_SELECTOR = '[data-onboarding-assignee="pivchik"]';
const SLIVCHIK_SELECTOR = '[data-onboarding-assignee="slivchik"]';
const HEADER_LANE_SELECTOR = '[data-onboarding="lane"]';
const SAMPLE_TASK_SELECTOR = `[data-task-id="${ONBOARDING_SAMPLE_TASK_ID}"]`;
const MENU_SELECTOR = '[data-onboarding-context-menu]';

export function useOnboardingTourRects(input: {
  open: boolean;
  scrollContainerRef: { readonly current: HTMLElement | null };
  step: PlannerOnboardingStep;
}): RectBox | null {
  const anchor = input.open ? plannerOnboardingAnchor(input.step) : null;
  const rowStep = anchor === 'lane' || anchor === 'lanes';
  const bothRows = anchor === 'lanes';
  const cardStep = anchor === 'task' || anchor === 'menu';
  const menuStep = anchor === 'menu';
  const pivchikRect = useOnboardingAnchorRect({
    active: rowStep,
    scrollContainerRef: input.scrollContainerRef,
    selector: rowStep ? PIVCHIK_SELECTOR : null,
  });
  const slivchikRect = useOnboardingAnchorRect({
    active: bothRows,
    scrollContainerRef: input.scrollContainerRef,
    selector: bothRows ? SLIVCHIK_SELECTOR : null,
  });
  const headerLaneRect = useOnboardingAnchorRect({
    active: input.open && input.step === 'lane' && pivchikRect == null,
    scrollContainerRef: input.scrollContainerRef,
    selector:
      input.open && input.step === 'lane' && pivchikRect == null ? HEADER_LANE_SELECTOR : null,
  });
  const scene = useOnboardingScene({
    active: anchor === 'day',
    scroll: anchor === 'day',
    scrollContainerRef: input.scrollContainerRef,
  });
  const cardRect = useOnboardingAnchorRect({
    active: cardStep,
    scrollContainerRef: input.scrollContainerRef,
    selector: cardStep ? SAMPLE_TASK_SELECTOR : null,
  });
  const menuRect = useOnboardingAnchorRect({
    active: menuStep,
    scrollContainerRef: input.scrollContainerRef,
    selector: menuStep ? MENU_SELECTOR : null,
  });
  return resolveTourAnchor(
    anchor === 'lanes' ? 'lane' : anchor,
    resolveLaneOutline(bothRows, pivchikRect, slivchikRect, headerLaneRect),
    scene?.column ?? null,
    cardRect,
    menuRect
  );
}

function resolveLaneOutline(
  bothRows: boolean,
  pivchik: RectBox | null,
  slivchik: RectBox | null,
  header: RectBox | null
): RectBox | null {
  if (bothRows) {
    return unionOnboardingRects(pivchik, slivchik);
  }
  return pivchik ?? header;
}

function resolveTourAnchor(
  anchor: 'day' | 'lane' | 'menu' | 'task' | null,
  laneRect: RectBox | null,
  column: RectBox | null,
  card: RectBox | null,
  menu: RectBox | null
): RectBox | null {
  if (anchor === 'day') {
    return column;
  }
  if (anchor === 'menu') {
    return unionOnboardingRects(card, menu);
  }
  if (anchor === 'task') {
    return card;
  }
  if (anchor === 'lane') {
    return laneRect;
  }
  return null;
}
