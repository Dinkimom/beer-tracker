/**
 * Спринты квартала и разбивка по рабочим дням (одна ячейка = один день).
 */

import type { QuarterlySprintInfo } from './types';
import type { Quarter } from '@/types';

import { getWorkingDaysRange } from '@/utils/dateUtils';

export const WORKING_DAYS_PER_SPRINT = 10;

interface QuarterSprintInfo {
  endDate: Date;
  id: number;
  name: string;
  quarter?: string | null;
  startDate: Date;
  /** Рабочие дни в этом спринте (для отображения колонок) */
  workingDays: number;
}

export function isRegisteredQuarterlySprint(
  sprint: Pick<QuarterlySprintInfo, 'isUnregistered'>
): boolean {
  return sprint.isUnregistered !== true;
}

function getFirstWorkingDayOnOrAfter(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function getSprintSlotEnd(startDate: Date): Date {
  const days = getWorkingDaysRange(startDate, WORKING_DAYS_PER_SPRINT);
  return days[days.length - 1] ?? startDate;
}

function getNextSprintSlotStart(prevEndDate: Date): Date {
  const d = new Date(prevEndDate);
  d.setDate(d.getDate() + 1);
  return getFirstWorkingDayOnOrAfter(d);
}

function buildPlaceholderSlot(
  startDate: Date,
  placeholderIndex: number
): QuarterlySprintInfo {
  const endDate = getSprintSlotEnd(startDate);
  return {
    id: `unregistered-${placeholderIndex}`,
    name: '',
    startDate,
    endDate,
    isUnregistered: true,
  };
}

function buildPlaceholderSlotsForQuarter(
  quarterStart: Date,
  quarterEnd: Date
): QuarterlySprintInfo[] {
  const result: QuarterlySprintInfo[] = [];
  let slotStart = getFirstWorkingDayOnOrAfter(quarterStart);
  let placeholderIndex = 0;

  while (slotStart <= quarterEnd) {
    result.push(buildPlaceholderSlot(slotStart, placeholderIndex));
    placeholderIndex += 1;
    slotStart = getNextSprintSlotStart(result[result.length - 1]!.endDate!);
  }

  return result;
}

/**
 * Спринты квартала для таймлайна: заведённые в трекере + слоты «не заведён» до конца квартала.
 * Индексы заведённых спринтов не смещаются — плейсхолдеры только после последнего реального.
 */
export function buildQuarterSprintTimeline<
  T extends { id: number; name?: string; quarter?: string | null; startDate: Date | string; endDate: Date | string },
>(
  sprints: T[],
  year: number,
  quarter: Quarter,
  metaById?: Map<number, { archived?: boolean; status?: string }>
): QuarterlySprintInfo[] {
  const { startDate: quarterStart, endDate: quarterEnd } = getQuarterDateRange(year, quarter);
  quarterEnd.setHours(23, 59, 59, 999);

  const registered = filterSprintsByQuarter(sprints, year, quarter);
  if (registered.length === 0) {
    return buildPlaceholderSlotsForQuarter(quarterStart, quarterEnd);
  }

  const result: QuarterlySprintInfo[] = registered.map((s) => {
    const meta = metaById?.get(s.id);
    return {
      id: s.id,
      name: s.name,
      quarter: s.quarter ?? null,
      startDate: s.startDate,
      endDate: s.endDate,
      archived: meta?.archived,
      status: meta?.status,
      isUnregistered: false,
    };
  });

  const last = result[result.length - 1]!;
  let slotStart = getNextSprintSlotStart(last.endDate ?? last.startDate);
  let placeholderIndex = 0;

  while (slotStart <= quarterEnd) {
    result.push(buildPlaceholderSlot(slotStart, placeholderIndex));
    placeholderIndex += 1;
    slotStart = getNextSprintSlotStart(result[result.length - 1]!.endDate!);
  }

  return result;
}

/**
 * Диапазон дат квартала.
 */
function getQuarterDateRange(
  year: number,
  quarter: Quarter
): { startDate: Date; endDate: Date } {
  const startMonth = (quarter - 1) * 3;
  const startDate = new Date(year, startMonth, 1);
  const endMonth = startMonth + 3;
  const endDate = new Date(year, endMonth, 0);
  return { startDate, endDate };
}

/**
 * Фильтрует спринты доски, попадающие в квартал.
 */
export function filterSprintsByQuarter<T extends { id: number; name?: string; quarter?: string | null; startDate: Date | string; endDate: Date | string }>(
  sprints: T[],
  year: number,
  quarter: Quarter
): QuarterSprintInfo[] {
  const { startDate: quarterStart, endDate: quarterEnd } = getQuarterDateRange(year, quarter);
  quarterEnd.setHours(23, 59, 59, 999);

  return sprints
    .filter((s) => {
      const start = new Date(s.startDate);
      const end = new Date(s.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return start <= quarterEnd && end >= quarterStart;
    })
    .map((s) => ({
      id: s.id,
      name: s.name ?? `Sprint ${s.id}`,
      quarter: s.quarter ?? null,
      startDate: new Date(s.startDate),
      endDate: new Date(s.endDate),
      workingDays: WORKING_DAYS_PER_SPRINT,
    }))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}
