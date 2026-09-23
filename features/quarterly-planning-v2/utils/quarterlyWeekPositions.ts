import type { TaskPosition } from '@/types';

import { getPartsPerDay } from '@/constants';

export const QUARTERLY_DAYS_PER_WEEK = 5;

/** Число недельных колонок, занимаемых позицией (после toWeekColumnPosition). */
export function weekCountFromColumnPosition(pos: TaskPosition): number {
  return Math.max(1, Math.ceil(pos.duration / getPartsPerDay()));
}

/** Глобальная позиция (рабочие дни квартала) → индексы недельных колонок для OccupancyPhaseBar. */
export function toWeekColumnPosition(pos: TaskPosition): TaskPosition {
  const durationInDays = pos.duration / getPartsPerDay();
  const durationWeeks = Math.max(1, Math.ceil(durationInDays / QUARTERLY_DAYS_PER_WEEK));
  return {
    ...pos,
    startDay: Math.floor(pos.startDay / QUARTERLY_DAYS_PER_WEEK),
    startPart: 0,
    duration: durationWeeks * getPartsPerDay(),
  };
}

/** Недельные колонки → глобальная позиция для сохранения фазы. */
export function fromWeekColumnPosition(pos: TaskPosition): TaskPosition {
  const durationWeeks = weekCountFromColumnPosition(pos);
  return {
    ...pos,
    startDay: pos.startDay * QUARTERLY_DAYS_PER_WEEK,
    startPart: 0,
    duration: durationWeeks * QUARTERLY_DAYS_PER_WEEK * getPartsPerDay(),
  };
}
