import type { QuarterlySprintInfo } from '../types';

import { WORKING_DAYS, WORKING_DAYS_PER_WEEK } from '@/constants';
import { getDayDate } from '@/lib/planner-timeline/occupancyUtils';
import { countWorkingDaysInclusiveCalendarRange } from '@/utils/dateUtils';

import {
  fallbackUnregisteredSprintNumber,
  findPrecedingRegisteredSprintNumber,
} from './resolveUnregisteredSprintNumberHelpers';

export const WEEKS_PER_SPRINT = 2;

export interface QuarterlyWeekColumn {
  sprintId: number | string;
  startDate: Date;
}

interface QuarterlyMonthSpan {
  colSpan: number;
  label: string;
  monthKey: string;
}

export function countWorkingDaysInSprint(sprint: QuarterlySprintInfo): number {
  if (sprint.endDate != null) {
    return Math.max(
      1,
      countWorkingDaysInclusiveCalendarRange(new Date(sprint.startDate), new Date(sprint.endDate))
    );
  }
  return WORKING_DAYS;
}

/** Одна колонка на рабочую неделю спринта (порядок = слева направо по кварталу). */
export function buildQuarterlyWeekColumns(sprintInfos: QuarterlySprintInfo[]): QuarterlyWeekColumn[] {
  const columns: QuarterlyWeekColumn[] = [];
  for (const sprint of sprintInfos) {
    const wd = countWorkingDaysInSprint(sprint);
    const weeksCount = Math.ceil(wd / WORKING_DAYS_PER_WEEK);
    for (let weekInSprint = 0; weekInSprint < weeksCount; weekInSprint++) {
      const dayIndex = weekInSprint * WORKING_DAYS_PER_WEEK;
      columns.push({
        sprintId: sprint.id,
        startDate: getDayDate(new Date(sprint.startDate), dayIndex, wd),
      });
    }
  }
  return columns;
}

export function buildQuarterlyMonthSpans(
  weekColumns: QuarterlyWeekColumn[],
  locale: string
): QuarterlyMonthSpan[] {
  if (weekColumns.length === 0) return [];

  const spans: QuarterlyMonthSpan[] = [];
  let i = 0;
  while (i < weekColumns.length) {
    const startDate = weekColumns[i].startDate;
    const monthKey = `${startDate.getFullYear()}-${startDate.getMonth()}`;
    const label = startDate.toLocaleDateString(locale, { month: 'long' });
    let colSpan = 0;
    while (
      i + colSpan < weekColumns.length &&
      `${weekColumns[i + colSpan].startDate.getFullYear()}-${weekColumns[i + colSpan].startDate.getMonth()}` ===
        monthKey
    ) {
      colSpan++;
    }
    spans.push({ monthKey, label, colSpan });
    i += colSpan;
  }
  return spans;
}

export function formatWeekStartLabel(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

/** Индексы недельных колонок таймлайна, принадлежащих спринту (weekIndex событий). */
export function getWeekColumnIndicesForSprint(
  sprintInfos: QuarterlySprintInfo[],
  sprintId: number | string
): number[] {
  const sprintIdStr = String(sprintId);
  const columns = buildQuarterlyWeekColumns(sprintInfos);
  const indices: number[] = [];
  for (let i = 0; i < columns.length; i++) {
    if (String(columns[i]!.sprintId) === sprintIdStr) {
      indices.push(i);
    }
  }
  return indices;
}

/** Короткая подпись спринта в шапке: только номер («Team 2601» → «2601»). */
export function formatSprintHeaderShortLabel(sprintName: string): string {
  const trimmed = sprintName.trim();
  const trailing = trailingDigitsRun(trimmed);
  if (trailing && trailing.length >= 2) return trailing;
  const any = firstDigitRun(trimmed);
  if (any) return any;
  return trimmed;
}

function trailingDigitsRun(value: string): string | null {
  let index = value.length - 1;
  while (index >= 0) {
    const code = value.charCodeAt(index);
    if (code < 48 || code > 57) break;
    index -= 1;
  }
  const run = value.slice(index + 1);
  return run.length > 0 ? run : null;
}

function firstDigitRun(value: string): string | null {
  const match = /\d+/.exec(value);
  return match?.[0] ?? null;
}

/** Номер для слота без спринта в трекере: продолжение последнего заведённого или YYxx от даты. */
export function resolveUnregisteredSprintNumber(
  sprintInfos: Array<{ isUnregistered?: boolean; name: string; startDate: Date }>,
  index: number
): string {
  const fromPreceding = findPrecedingRegisteredSprintNumber(sprintInfos, index);
  if (fromPreceding != null) return fromPreceding;
  return fallbackUnregisteredSprintNumber(sprintInfos, index);
}

export function totalWeekColumnsForSprints(sprintInfos: QuarterlySprintInfo[]): number {
  return buildQuarterlyWeekColumns(sprintInfos).length;
}
