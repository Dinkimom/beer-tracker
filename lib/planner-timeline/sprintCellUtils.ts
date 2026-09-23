/**
 * Утилиты для преобразования даты/времени в индекс ячейки спринта.
 * Рабочие дни: 0–4 (пн–пт), 5–9 (пн–пт следующей недели), части дня 9:00–18:00 по 3 часа.
 */

import { WORKING_DAYS, getPartsPerDay } from '@/constants';
import { getWorkingDaysRange } from '@/utils/dateUtils';

import { scanWorkingDayIndexFromStart } from './sprintCellUtilsHelpers';

/** Всего ячеек стандартного спринта при текущей сетке дня. */
export function getSprintTotalParts(): number {
  return WORKING_DAYS * getPartsPerDay();
}

/**
 * Снимок на момент загрузки модуля для легаси-занятости.
 * Планер берёт живую сетку через {@link getSprintTotalParts}.
 */
export const TOTAL_PARTS = WORKING_DAYS * 3;

/** Дата/время → индекс рабочего дня в сетке из workingDaysCount дней (по умолчанию один «стандартный» спринт). */
function getWorkingDayIndex(
  sprintStartDate: Date,
  d: Date,
  workingDaysCount: number = WORKING_DAYS
): number {
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const targetMs = target.getTime();
  const range = getWorkingDaysRange(sprintStartDate, Math.max(1, workingDaysCount));
  for (let i = 0; i < range.length; i++) {
    const dayDate = new Date(range[i]!);
    dayDate.setHours(0, 0, 0, 0);
    if (dayDate.getTime() === targetMs) return i;
  }
  return -1;
}

/** Рабочий день 9:00–18:00 делится на равные слоты текущей сетки. */
const WORKDAY_START_MIN = 9 * 60;
const WORKDAY_END_MIN = 18 * 60;

function partDurationMin(): number {
  return (WORKDAY_END_MIN - WORKDAY_START_MIN) / getPartsPerDay();
}

/**
 * Суббота/воскресенье не совпадают с «рабочими» днями в getWorkingDayIndex* (там считаются только пн–пт),
 * из‑за чего «сейчас» в выходной ошибочно попадало в конец диапазона. Снап к пятнице 18:00 — конец последнего слота перед выходными.
 */
function snapWeekendToLastWorkingMoment(d: Date): Date {
  const result = new Date(d);
  const dow = result.getDay();
  if (dow === 6) {
    result.setDate(result.getDate() - 1);
    result.setHours(18, 0, 0, 0);
  } else if (dow === 0) {
    result.setDate(result.getDate() - 2);
    result.setHours(18, 0, 0, 0);
  }
  return result;
}

function getPartAndFraction(d: Date): { fraction: number; part: number } {
  const totalMinutes = d.getHours() * 60 + d.getMinutes();

  if (totalMinutes < WORKDAY_START_MIN) {
    return { fraction: 0, part: 0 };
  }
  const lastPart = getPartsPerDay() - 1;
  if (totalMinutes >= WORKDAY_END_MIN) {
    return { fraction: 1, part: lastPart };
  }

  const slotMinutes = partDurationMin();
  const minutesIntoWorkday = totalMinutes - WORKDAY_START_MIN;
  const part = Math.floor(minutesIntoWorkday / slotMinutes);
  const minutesIntoPart = minutesIntoWorkday - part * slotMinutes;
  const fraction = minutesIntoPart / slotMinutes;
  return { fraction, part: Math.min(part, lastPart) };
}

/** Дата/время → дробный индекс ячейки (0..totalParts) для точного позиционирования. Возвращает < 0 до спринта, > totalParts после. */
export function dateTimeToFractionalCell(
  sprintStartDate: Date,
  d: Date,
  workingDaysCount: number = WORKING_DAYS
): number {
  const totalParts = workingDaysCount * getPartsPerDay();
  const adjusted = snapWeekendToLastWorkingMoment(d);
  const dayIdx = getWorkingDayIndex(sprintStartDate, adjusted, workingDaysCount);
  if (dayIdx < 0) {
    const first = new Date(sprintStartDate);
    first.setHours(0, 0, 0, 0);
    if (adjusted.getTime() < first.getTime()) return -1;
    return totalParts + 1;
  }

  const { fraction, part } = getPartAndFraction(adjusted);
  return dayIdx * getPartsPerDay() + part + fraction;
}

/**
 * Индекс рабочего дня в диапазоне от sprintStartDate (0 = первый рабочий день, 1 = второй, …).
 * Рабочие дни считаются пн–пт. Возвращает -1 если дата до начала, workingDaysCount если после конца.
 */
function getWorkingDayIndexInRange(
  sprintStartDate: Date,
  d: Date,
  workingDaysCount: number
): number {
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const targetMs = target.getTime();
  const start = new Date(sprintStartDate);
  start.setHours(0, 0, 0, 0);
  if (targetMs < start.getTime()) return -1;

  return scanWorkingDayIndexFromStart(start, targetMs, workingDaysCount);
}

/**
 * То же, что dateTimeToFractionalCell, но для диапазона из workingDaysCount рабочих дней
 * (например, 60 для 6 спринтов). totalParts = workingDaysCount * getPartsPerDay().
 */
export function dateTimeToFractionalCellInRange(
  sprintStartDate: Date,
  d: Date,
  totalParts: number
): number {
  const adjusted = snapWeekendToLastWorkingMoment(d);
  const workingDaysCount = totalParts / getPartsPerDay();
  const dayIdx = getWorkingDayIndexInRange(sprintStartDate, adjusted, workingDaysCount);
  if (dayIdx < 0) return -1;
  if (dayIdx >= workingDaysCount) return totalParts + 1;

  const { fraction, part } = getPartAndFraction(adjusted);
  return dayIdx * getPartsPerDay() + part + fraction;
}
