/**
 * Сетка дня и шкала «сторипоинты → таймслоты» организации.
 * По умолчанию — три слота в дне и прежняя лестница (1 SP ≈ 1 слот).
 * Активная шкала читается чистыми хелперами планера: они не ходят в React.
 */

import { z } from 'zod';

const MAX_TIMESLOTS_PER_DAY = 4;
export const MAX_PLANNER_PART_INDEX = MAX_TIMESLOTS_PER_DAY - 1;
/** Как `MAX_PLANNER_DURATION_PARTS`: длина шага не длиннее карточки планера. */
const MAX_STEP_SLOTS = 400;
const MAX_CUSTOM_STEPS = 12;
const MAX_STEP_STORY_POINTS = 999;

const TimeslotsPerDaySchema = z.union([z.literal(2), z.literal(3), z.literal(4)]);
export type TimeslotsPerDay = z.infer<typeof TimeslotsPerDaySchema>;

const EstimateUnitSchema = z.enum(['custom', 'day', 'timeslot']);
type EstimateUnit = z.infer<typeof EstimateUnitSchema>;

export interface PlannerTimelineStep {
  /** Длина новой карточки, в таймслотах. */
  slots: number;
  storyPoints: number;
  /** До этой длины карточка всё ещё считается этими сторипоинтами. Дальше — следующее значение. */
  untilSlots?: number;
}

export interface PlannerTimelineScale {
  estimateUnit: EstimateUnit;
  /** Своя лестница: длина каждого SP в таймслотах. 2 × (1 SP) не обязано равняться 2 SP. */
  steps?: PlannerTimelineStep[];
  timeslotsPerDay: TimeslotsPerDay;
}

export const DEFAULT_PLANNER_TIMELINE_SCALE: PlannerTimelineScale = {
  estimateUnit: 'timeslot',
  timeslotsPerDay: 3,
};

const PlannerTimelineStepSchema = z
  .object({
    slots: z.number().int().min(1).max(MAX_STEP_SLOTS),
    storyPoints: z.number().int().min(1).max(MAX_STEP_STORY_POINTS),
    untilSlots: z.number().int().min(1).max(MAX_STEP_SLOTS).optional(),
  })
  .strict();

export const PlannerTimelineScalePatchSchema = z
  .object({
    confirmGridMigration: z.boolean().optional(),
    estimateUnit: EstimateUnitSchema,
    steps: z.array(PlannerTimelineStepSchema).max(MAX_CUSTOM_STEPS).optional(),
    timeslotsPerDay: TimeslotsPerDaySchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.estimateUnit !== 'custom') return;
    if (!orderedPlannerTimelineSteps(value.steps ?? [])) {
      ctx.addIssue({ code: 'custom', message: 'Invalid planner steps', path: ['steps'] });
    }
  });

export type PlannerTimelineScalePatch = z.infer<typeof PlannerTimelineScalePatchSchema>;

let timeslotsPerDay: TimeslotsPerDay = DEFAULT_PLANNER_TIMELINE_SCALE.timeslotsPerDay;
let estimateUnit: EstimateUnit = DEFAULT_PLANNER_TIMELINE_SCALE.estimateUnit;
let customSteps: PlannerTimelineStep[] = [];

export function getPartsPerDay(): TimeslotsPerDay {
  return timeslotsPerDay;
}

export function getActivePlannerTimelineScale(): PlannerTimelineScale {
  if (estimateUnit !== 'custom') return { estimateUnit, timeslotsPerDay };
  return {
    estimateUnit,
    steps: customSteps.map((step) => ({ ...step })),
    timeslotsPerDay,
  };
}

export function setActivePlannerTimelineScale(scale: PlannerTimelineScale): void {
  timeslotsPerDay = scale.timeslotsPerDay;
  estimateUnit = scale.estimateUnit;
  const ordered = scale.estimateUnit === 'custom' ? orderedPlannerTimelineSteps(scale.steps ?? []) : null;
  customSteps = ordered ?? [];
}

function isPlannerScaleCustomized(scale: PlannerTimelineScale = getActivePlannerTimelineScale()): boolean {
  return (
    scale.timeslotsPerDay !== DEFAULT_PLANNER_TIMELINE_SCALE.timeslotsPerDay ||
    scale.estimateUnit !== DEFAULT_PLANNER_TIMELINE_SCALE.estimateUnit
  );
}

/** Сколько слотов приходится на 1 SP в начале шкалы. «Сутки» = вся сетка дня. */
function estimateTimeslotMultiplier(scale: PlannerTimelineScale = getActivePlannerTimelineScale()): number {
  return scale.estimateUnit === 'day' ? scale.timeslotsPerDay : 1;
}

const TIMESLOTS_TO_SP_THRESHOLDS: readonly [number, number][] = [
  [1, 1],
  [2, 2],
  [3, 3],
  [5, 5],
  [7, 8],
  [9, 13],
];

const SP_TO_TIMESLOTS_THRESHOLDS: readonly [number, number][] = [
  [1, 1],
  [2, 2],
  [3, 3],
  [5, 5],
  [8, 6],
  [13, 8],
];

const SCALE_ANCHOR_STORY_POINTS = [1, 2, 3, 5, 8, 13, 21] as const;

function baseTimeslotsToStoryPoints(units: number): number {
  for (const [maxTimeslots, storyPoints] of TIMESLOTS_TO_SP_THRESHOLDS) {
    if (units <= maxTimeslots) return storyPoints;
  }
  return 21;
}

function baseStoryPointsToTimeslots(sp: number): number {
  for (const [maxSp, timeslots] of SP_TO_TIMESLOTS_THRESHOLDS) {
    if (sp <= maxSp) return timeslots;
  }
  return 10;
}

function activeCustomSteps(scale: PlannerTimelineScale): PlannerTimelineStep[] | null {
  if (scale.estimateUnit !== 'custom') return null;
  return orderedPlannerTimelineSteps(scale.steps ?? []);
}

function promotedStoryPoints(
  timeslots: number,
  steps: readonly PlannerTimelineStep[],
  index: number
): number | null {
  if (index === 0 || timeslots >= steps[index].slots) return null;
  const previousUntil = steps[index - 1].untilSlots;
  if (previousUntil != null && timeslots > previousUntil) return steps[index].storyPoints;
  return null;
}

function customTimeslotsToStoryPoints(timeslots: number, steps: readonly PlannerTimelineStep[]): number {
  let storyPoints = 0;
  for (let index = 0; index < steps.length; index += 1) {
    const promoted = promotedStoryPoints(timeslots, steps, index);
    if (promoted != null) return promoted;
    const step = steps[index];
    if (timeslots < step.slots) return storyPoints;
    storyPoints = step.storyPoints;
    const next = steps[index + 1];
    const until = step.untilSlots ?? (next ? next.slots - 1 : Number.POSITIVE_INFINITY);
    if (timeslots <= until) return storyPoints;
  }
  return storyPoints;
}

export function timeslotsToStoryPointsForScale(timeslots: number, scale: PlannerTimelineScale): number {
  if (timeslots <= 0) return 0;
  const steps = activeCustomSteps(scale);
  if (steps) return customTimeslotsToStoryPoints(timeslots, steps);
  const units = Math.floor(timeslots / estimateTimeslotMultiplier(scale));
  if (units <= 0) return 0;
  return baseTimeslotsToStoryPoints(units);
}

export function storyPointsToTimeslotsForScale(sp: number, scale: PlannerTimelineScale): number {
  if (sp <= 0) return 0;
  const steps = activeCustomSteps(scale);
  if (steps) {
    const step = steps.find((row) => sp <= row.storyPoints) ?? steps[steps.length - 1];
    return step.slots;
  }
  return baseStoryPointsToTimeslots(sp) * estimateTimeslotMultiplier(scale);
}

/**
 * Уже стоящая карточка не переписывает оценку, если её длина снята со старой шкалы.
 * Пока настройка не менялась, ресайз ведёт себя как раньше.
 */
export function resizeShouldPreserveEstimate(input: {
  currentEstimate: number;
  previousDuration: number | null;
  scale?: PlannerTimelineScale;
}): boolean {
  const scale = input.scale ?? getActivePlannerTimelineScale();
  if (!isPlannerScaleCustomized(scale)) return false;
  if (input.previousDuration == null) return true;
  return input.previousDuration !== storyPointsToTimeslotsForScale(input.currentEstimate, scale);
}

export interface EstimateScalePreviewRow {
  remainderSlots: number;
  storyPoints: number;
  timeslots: number;
  wholeDays: number;
}

function isPlannerTimelineStep(step: PlannerTimelineStep): boolean {
  const untilFits =
    step.untilSlots == null ||
    (Number.isInteger(step.untilSlots) && step.untilSlots >= step.slots && step.untilSlots <= MAX_STEP_SLOTS);
  return (
    Number.isInteger(step.storyPoints) &&
    step.storyPoints >= 1 &&
    step.storyPoints <= MAX_STEP_STORY_POINTS &&
    Number.isInteger(step.slots) &&
    step.slots >= 1 &&
    step.slots <= MAX_STEP_SLOTS &&
    untilFits
  );
}

function copyPlannerTimelineStep(step: PlannerTimelineStep): PlannerTimelineStep {
  if (step.untilSlots == null) return { slots: step.slots, storyPoints: step.storyPoints };
  return { slots: step.slots, storyPoints: step.storyPoints, untilSlots: step.untilSlots };
}

function stepsIncrease(steps: readonly PlannerTimelineStep[]): boolean {
  for (let index = 1; index < steps.length; index += 1) {
    if (steps[index].storyPoints === steps[index - 1].storyPoints) return false;
    if (steps[index].slots <= steps[index - 1].slots) return false;
    const previousUntil = steps[index - 1].untilSlots;
    if (previousUntil != null && previousUntil >= steps[index].slots) return false;
  }
  return true;
}

/** Строки своей лестницы: уникальные SP, длина строго растёт. Иначе null. */
export function orderedPlannerTimelineSteps(
  steps: readonly PlannerTimelineStep[]
): PlannerTimelineStep[] | null {
  if (steps.length === 0 || steps.length > MAX_CUSTOM_STEPS) return null;
  const sorted = steps.map((step) => copyPlannerTimelineStep(step));
  sorted.sort((left, right) => left.storyPoints - right.storyPoints);
  if (sorted.some((step) => !isPlannerTimelineStep(step))) return null;
  if (!stepsIncrease(sorted)) return null;
  return sorted;
}

/** Стартовая своя лестница из текущего пресета: якоря 1, 2, 3, 5, 8, 13, 21. */
export function presetPlannerTimelineSteps(scale: PlannerTimelineScale): PlannerTimelineStep[] {
  const preset: PlannerTimelineScale =
    scale.estimateUnit === 'custom'
      ? { estimateUnit: 'timeslot', timeslotsPerDay: scale.timeslotsPerDay }
      : { estimateUnit: scale.estimateUnit, timeslotsPerDay: scale.timeslotsPerDay };
  const widths = SCALE_ANCHOR_STORY_POINTS.map((storyPoints) =>
    storyPointsToTimeslotsForScale(storyPoints, preset)
  );
  return SCALE_ANCHOR_STORY_POINTS.map((storyPoints, index) => ({
    slots: index === 0 ? 1 : widths[index],
    storyPoints,
  }));
}

function scaleStepLength(step: PlannerTimelineStep, from: TimeslotsPerDay, to: TimeslotsPerDay): PlannerTimelineStep {
  const slots = scalePlannerDuration(step.slots, from, to);
  if (step.untilSlots == null) return { slots, storyPoints: step.storyPoints };
  return {
    slots,
    storyPoints: step.storyPoints,
    untilSlots: Math.max(slots, scalePlannerDuration(step.untilSlots, from, to)),
  };
}

function keepStepAfterPrevious(step: PlannerTimelineStep, previous: PlannerTimelineStep): PlannerTimelineStep {
  let slots = step.slots;
  if (slots <= previous.slots) slots = previous.slots + 1;
  if (previous.untilSlots != null && slots <= previous.untilSlots) slots = previous.untilSlots + 1;
  if (step.untilSlots == null) return { slots, storyPoints: step.storyPoints };
  return {
    slots,
    storyPoints: step.storyPoints,
    untilSlots: Math.max(step.untilSlots, slots),
  };
}

/** Доля дня в своей лестнице сохраняется при смене сетки. Совпавшие длины разводятся на слот. */
export function rescalePlannerTimelineSteps(
  steps: readonly PlannerTimelineStep[],
  from: TimeslotsPerDay,
  to: TimeslotsPerDay
): PlannerTimelineStep[] {
  const scaled = [...steps]
    .sort((left, right) => left.storyPoints - right.storyPoints)
    .map((step) => scaleStepLength(step, from, to));
  for (let index = 1; index < scaled.length; index += 1) {
    scaled[index] = keepStepAfterPrevious(scaled[index], scaled[index - 1]);
  }
  return scaled;
}

export function plannerTimelineScalesEqual(left: PlannerTimelineScale, right: PlannerTimelineScale): boolean {
  if (left.timeslotsPerDay !== right.timeslotsPerDay || left.estimateUnit !== right.estimateUnit) return false;
  if (left.estimateUnit !== 'custom') return true;
  const leftSteps = orderedPlannerTimelineSteps(left.steps ?? []);
  const rightSteps = orderedPlannerTimelineSteps(right.steps ?? []);
  if (!leftSteps || !rightSteps || leftSteps.length !== rightSteps.length) return false;
  return leftSteps.every(
    (step, index) =>
      step.storyPoints === rightSteps[index].storyPoints &&
      step.slots === rightSteps[index].slots &&
      step.untilSlots === rightSteps[index].untilSlots
  );
}

export function plannerTimelineScaleFromPatch(patch: PlannerTimelineScalePatch): PlannerTimelineScale {
  if (patch.estimateUnit !== 'custom') {
    return { estimateUnit: patch.estimateUnit, timeslotsPerDay: patch.timeslotsPerDay };
  }
  const steps = orderedPlannerTimelineSteps(patch.steps ?? []);
  if (!steps) return { estimateUnit: 'timeslot', timeslotsPerDay: patch.timeslotsPerDay };
  return { estimateUnit: 'custom', steps, timeslotsPerDay: patch.timeslotsPerDay };
}

export function buildEstimateScalePreview(scale: PlannerTimelineScale): EstimateScalePreviewRow[] {
  const custom = activeCustomSteps(scale);
  const points = custom ? custom.map((step) => step.storyPoints) : SCALE_ANCHOR_STORY_POINTS;
  return points.map((storyPoints) => {
    const timeslots = storyPointsToTimeslotsForScale(storyPoints, scale);
    return {
      remainderSlots: timeslots % scale.timeslotsPerDay,
      storyPoints,
      timeslots,
      wholeDays: Math.floor(timeslots / scale.timeslotsPerDay),
    };
  });
}

export function scalePlannerSlot(part: number, from: TimeslotsPerDay, to: TimeslotsPerDay): number {
  if (from === to) return part;
  const scaled = Math.round((part * to) / from);
  return Math.min(to - 1, Math.max(0, scaled));
}

export function scalePlannerDuration(duration: number, from: TimeslotsPerDay, to: TimeslotsPerDay): number {
  if (from === to || duration <= 0) return duration;
  return Math.max(1, Math.round((duration * to) / from));
}

/** Доля дня или длина изменились относительно целого числа слотов. Целые сутки не сдвигаются. */
export function plannerCoordinateShifts(
  part: number,
  duration: number,
  from: TimeslotsPerDay,
  to: TimeslotsPerDay
): boolean {
  const nextPart = scalePlannerSlot(part, from, to);
  const nextDuration = scalePlannerDuration(duration, from, to);
  return nextPart * from !== part * to || nextDuration * from !== duration * to;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readCustomSteps(value: unknown): PlannerTimelineStep[] | null {
  if (!Array.isArray(value)) return null;
  const steps: PlannerTimelineStep[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.storyPoints !== 'number' || typeof item.slots !== 'number') return null;
    const step: PlannerTimelineStep = { slots: item.slots, storyPoints: item.storyPoints };
    if (typeof item.untilSlots === 'number') step.untilSlots = item.untilSlots;
    steps.push(step);
  }
  return orderedPlannerTimelineSteps(steps);
}

export function readPlannerTimelineScale(settingsRoot: unknown): PlannerTimelineScale {
  if (!isRecord(settingsRoot) || !isRecord(settingsRoot.planner)) {
    return DEFAULT_PLANNER_TIMELINE_SCALE;
  }
  const planner = settingsRoot.planner;
  const timeslots = TimeslotsPerDaySchema.safeParse(planner.timeslotsPerDay);
  const unit = EstimateUnitSchema.safeParse(planner.estimateUnit);
  const timeslotsPerDay = timeslots.success ? timeslots.data : DEFAULT_PLANNER_TIMELINE_SCALE.timeslotsPerDay;
  const estimateUnit = unit.success ? unit.data : DEFAULT_PLANNER_TIMELINE_SCALE.estimateUnit;
  if (estimateUnit !== 'custom') return { estimateUnit, timeslotsPerDay };
  const steps = readCustomSteps(planner.steps);
  if (!steps) return { estimateUnit: 'timeslot', timeslotsPerDay };
  return { estimateUnit: 'custom', steps, timeslotsPerDay };
}

export function mergePlannerTimelineScale(
  settingsRoot: unknown,
  scale: PlannerTimelineScale
): Record<string, unknown> {
  const root = isRecord(settingsRoot) ? { ...settingsRoot } : {};
  const planner = isRecord(root.planner) ? { ...root.planner } : {};
  planner.estimateUnit = scale.estimateUnit;
  planner.timeslotsPerDay = scale.timeslotsPerDay;
  if (scale.estimateUnit === 'custom') {
    const steps = orderedPlannerTimelineSteps(scale.steps ?? []);
    if (steps) planner.steps = steps;
  } else {
    delete planner.steps;
  }
  root.planner = planner;
  return root;
}

export function partFitsPlannerGrid(part: number | null | undefined, scale: PlannerTimelineScale): boolean {
  if (part == null) return true;
  return part >= 0 && part < scale.timeslotsPerDay;
}
