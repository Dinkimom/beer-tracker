/** Показ тура и подсказок. Код остаётся, на доске ничего не рисуется, пока флаг false. */
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

const PLANNER_ONBOARDING_TIPS = ['featuresView', 'layers', 'link', 'taskTool'] as const;

export type PlannerOnboardingTip = (typeof PLANNER_ONBOARDING_TIPS)[number];

interface PlannerOnboardingPersisted {
  seenTips: PlannerOnboardingTip[];
  tourCompleted: boolean;
}

export interface PlannerOnboardingTipSignals {
  featuresView: boolean;
  layers: boolean;
  link: boolean;
  taskTool: boolean;
}

export const DEFAULT_PLANNER_ONBOARDING: PlannerOnboardingPersisted = {
  seenTips: [],
  tourCompleted: false,
};

const ONBOARDING_SURFACES = new Set(['compact', 'features', 'full']);

const TIP_ORDER: readonly PlannerOnboardingTip[] = [
  'taskTool',
  'link',
  'featuresView',
  'layers',
];

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
    if (!taskId.startsWith('comment:') && !taskId.startsWith('local-task-')) {
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

function isPlannerOnboardingTip(value: unknown): value is PlannerOnboardingTip {
  return (
    typeof value === 'string' &&
    (PLANNER_ONBOARDING_TIPS as readonly string[]).includes(value)
  );
}

export function normalizePlannerOnboarding(value: unknown): PlannerOnboardingPersisted {
  if (value == null || typeof value !== 'object') {
    return { seenTips: [], tourCompleted: false };
  }
  const record = value as { seenTips?: unknown; tourCompleted?: unknown };
  const seenTips: PlannerOnboardingTip[] = [];
  if (Array.isArray(record.seenTips)) {
    for (const tip of record.seenTips) {
      if (isPlannerOnboardingTip(tip) && !seenTips.includes(tip)) {
        seenTips.push(tip);
      }
    }
  }
  return {
    seenTips,
    tourCompleted: record.tourCompleted === true,
  };
}

export function resolvePlannerOnboardingTip(
  tipsEnabled: boolean,
  seenTips: readonly PlannerOnboardingTip[],
  signals: PlannerOnboardingTipSignals
): PlannerOnboardingTip | null {
  if (!tipsEnabled) {
    return null;
  }
  const seen = new Set(seenTips);
  for (const tip of TIP_ORDER) {
    if (signals[tip] && !seen.has(tip)) {
      return tip;
    }
  }
  return null;
}

export function withPlannerOnboardingTipSeen(
  state: PlannerOnboardingPersisted,
  tip: PlannerOnboardingTip
): PlannerOnboardingPersisted {
  if (state.seenTips.includes(tip)) {
    return state;
  }
  return { ...state, seenTips: [...state.seenTips, tip] };
}
