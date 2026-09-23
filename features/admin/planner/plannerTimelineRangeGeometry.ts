import type { PlannerTimelineStep, TimeslotsPerDay } from '@/lib/plannerTimelineScale';

const SPRINT_DAYS = 10;

export function plannerTimelineTrackSlots(
  steps: readonly Pick<PlannerTimelineStep, 'slots' | 'untilSlots'>[],
  timeslotsPerDay: TimeslotsPerDay
): number {
  let maxSlot = SPRINT_DAYS * timeslotsPerDay;
  for (const step of steps) {
    maxSlot = Math.max(maxSlot, step.slots, step.untilSlots ?? step.slots);
  }
  return (Math.ceil(maxSlot / timeslotsPerDay) + 1) * timeslotsPerDay;
}

/** Совпадает с w-4 рукоятки range: браузер ставит её центр с отступом в половину кружка. */
const RANGE_THUMB_PX = 16;

/** Точка, где окажется центр нативной рукоятки для этого слота. */
export function plannerSlotCenter(slot: number, trackSlots: number): string {
  const thumb = RANGE_THUMB_PX;
  if (trackSlots <= 1) return `${thumb / 2}px`;
  return `calc(${thumb / 2}px + ${slot - 1} / ${trackSlots - 1} * (100% - ${thumb}px))`;
}

export type CountPlural = 'few' | 'many' | 'one';

/** 1, 21 таймслот; 2–4 таймслота; 5–20, 11–14 таймслотов. */
export function ruCountPlural(count: number): CountPlural {
  const abs = Math.abs(Math.trunc(count));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
  return 'many';
}

/** Русские формы: 1 день, 1,5 и 2–4 дня, 21 день, остальные — дней. В английском только 1 day. */
export function plannerDayLengthPlural(
  slots: number,
  timeslotsPerDay: number,
  language: string
): CountPlural {
  const days = slots / timeslotsPerDay;
  if (language !== 'ru') return Math.abs(days - 1) < 0.001 ? 'one' : 'many';
  if (!Number.isInteger(days)) return 'few';
  return ruCountPlural(days);
}

/** Конец отрезка — это начало следующего, отдельной границы нет. */
export function clampPlannerTimelineStep(
  steps: readonly PlannerTimelineStep[],
  index: number,
  raw: number,
  trackSlots: number
): PlannerTimelineStep {
  const step = steps[index];
  const previous = steps[index - 1];
  const following = steps[index + 1];
  const floor = previous == null ? 1 : Math.max(previous.slots, previous.untilSlots ?? previous.slots) + 1;
  const ceiling = following == null ? trackSlots : following.slots - 1;
  return { slots: Math.min(ceiling, Math.max(raw, floor)), storyPoints: step.storyPoints };
}
