import type { QuarterNumber, QuarterRef } from './quarterlyPlanTypes';

import { formatLocalDateToIsoDateOnly, parseIsoDateOnly } from '@/lib/isoDateOnlyCalendar';

export const QUARTER_WORKING_DAYS_PER_WEEK = 5;

export interface QuarterWeek {
  /** Пятница, ISO date-only. */
  endDate: string;
  index: number;
  /** Месяц недели (0–11) — по её четвергу, как в ISO-неделях. */
  month: number;
  /** Понедельник, ISO date-only. */
  startDate: string;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Четверг недели (пн–вс), в которую попадает дата. */
function thursdayOfWeek(date: Date): Date {
  const mondayOffset = (date.getDay() + 6) % 7;
  const thursday = addDays(date, 3 - mondayOffset);
  thursday.setHours(12, 0, 0, 0);
  return thursday;
}

/**
 * Рабочие недели квартала. Неделя принадлежит тому кварталу, где её четверг,
 * поэтому соседние кварталы не делят одну неделю и не теряют ни одной.
 */
export function buildQuarterWeeks({ quarter, year }: QuarterRef): QuarterWeek[] {
  const firstMonth = (quarter - 1) * 3;
  let thursday = thursdayOfWeek(new Date(year, firstMonth, 1, 12));
  if (thursday.getMonth() !== firstMonth || thursday.getFullYear() !== year) {
    thursday = addDays(thursday, 7);
  }
  const weeks: QuarterWeek[] = [];
  while (thursday.getFullYear() === year && thursday.getMonth() < firstMonth + 3) {
    weeks.push({
      endDate: formatLocalDateToIsoDateOnly(addDays(thursday, 1)),
      index: weeks.length,
      month: thursday.getMonth(),
      startDate: formatLocalDateToIsoDateOnly(addDays(thursday, -3)),
    });
    thursday = addDays(thursday, 7);
  }
  return weeks;
}

export function quarterOfDate(date: Date): QuarterRef {
  const thursday = thursdayOfWeek(date);
  return {
    quarter: (Math.floor(thursday.getMonth() / 3) + 1) as QuarterNumber,
    year: thursday.getFullYear(),
  };
}

/** Кварталы, которые задевает окно спринта: обычно один, на стыке кварталов — два (QW3). */
export function quartersOfWindow(window: { endDate: string; startDate: string }): QuarterRef[] {
  const refs = [window.startDate, window.endDate].flatMap((iso) => {
    const parsed = parseIsoDateOnly(iso.slice(0, 10));
    return parsed ? [quarterOfDate(new Date(parsed.y, parsed.m - 1, parsed.d, 12))] : [];
  });
  return refs.filter((ref, index) => refs.findIndex((other) => other.year === ref.year && other.quarter === ref.quarter) === index);
}

export function shiftQuarter({ quarter, year }: QuarterRef, delta: number): QuarterRef {
  const index = year * 4 + (quarter - 1) + delta;
  return { quarter: ((index % 4) + 1) as QuarterNumber, year: Math.floor(index / 4) };
}

/** Недели квартала, которые период задевает рабочими днями; null — период вне квартала. */
export function resolveWeekSpan(
  weeks: readonly QuarterWeek[],
  startDate: string,
  endDate: string
): { startWeek: number; weeks: number } | null {
  const hit = weeks.filter((week) => week.startDate <= endDate && week.endDate >= startDate);
  if (hit.length === 0) return null;
  return { startWeek: hit[0]!.index, weeks: hit.length };
}

/** Индекс недели, в которую попадает дата; -1 — дата вне квартала. */
export function weekIndexOfDate(weeks: readonly QuarterWeek[], date: Date): number {
  const iso = formatLocalDateToIsoDateOnly(thursdayOfWeek(date));
  return weeks.findIndex((week) => week.startDate <= iso && week.endDate >= iso);
}

/** Подряд идущие недели одного месяца — для строки месяцев в шапке. */
export function groupWeeksByMonth(
  weeks: readonly QuarterWeek[]
): Array<{ month: number; startWeek: number; weeks: number }> {
  const groups: Array<{ month: number; startWeek: number; weeks: number }> = [];
  for (const week of weeks) {
    const last = groups[groups.length - 1];
    if (last && last.month === week.month) {
      last.weeks += 1;
    } else {
      groups.push({ month: week.month, startWeek: week.index, weeks: 1 });
    }
  }
  return groups;
}
