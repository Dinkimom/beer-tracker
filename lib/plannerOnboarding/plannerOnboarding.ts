import { isPlannerClientOnlyCardId } from '@/lib/planner/plannerCardKind';

/** Показ тура. Код остаётся, на доске ничего не рисуется, пока флаг false. */
export const PLANNER_ONBOARDING_ENABLED = true;

export const PLANNER_ONBOARDING_STEPS = [
  'lane',
  'span',
  'task',
  'resize',
  'drag',
  'assignees',
  'link',
  'menu',
] as const;

export type PlannerOnboardingStep = (typeof PLANNER_ONBOARDING_STEPS)[number];

interface PlannerOnboardingPersisted {
  tourCompleted: boolean;
}

export const DEFAULT_PLANNER_ONBOARDING: PlannerOnboardingPersisted = {
  tourCompleted: false,
};

const ONBOARDING_SURFACES = new Set(['compact', 'features', 'full']);

export function isPlannerOnboardingSurface(viewMode: string): boolean {
  return ONBOARDING_SURFACES.has(viewMode);
}

export function plannerBoardHasPlacedWork(
  positions: ReadonlyMap<string, unknown> | null | undefined
): boolean {
  if (positions == null) {
    return false;
  }
  for (const taskId of positions.keys()) {
    if (!isPlannerClientOnlyCardId(taskId)) {
      return true;
    }
  }
  return false;
}

export function plannerOnboardingAnchor(
  step: PlannerOnboardingStep
): 'day' | 'lane' | 'lanes' | 'menu' | 'task' {
  if (step === 'span') {
    return 'day';
  }
  if (step === 'task') {
    return 'task';
  }
  if (step === 'menu') {
    return 'menu';
  }
  if (step === 'assignees' || step === 'link') {
    return 'lanes';
  }
  return 'lane';
}

export function plannerOnboardingCalloutSide(
  step: PlannerOnboardingStep
): 'below' | 'right' {
  if (step === 'task' || step === 'span') {
    return 'right';
  }
  return 'below';
}

export function normalizePlannerOnboarding(value: unknown): PlannerOnboardingPersisted {
  if (value == null || typeof value !== 'object') {
    return { tourCompleted: false };
  }
  const record = value as { tourCompleted?: unknown };
  return {
    tourCompleted: record.tourCompleted === true,
  };
}
