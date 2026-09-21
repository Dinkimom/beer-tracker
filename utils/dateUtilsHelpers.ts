import type { SprintStatus } from '@/types';


const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
/** Рабочий день: 9 часов (9:00–18:00), пн–пт */
export const WORKDAY_START_MS = 9 * MS_PER_HOUR;
export const WORKDAY_END_MS = 18 * MS_PER_HOUR;
export const WORKDAY_END_MINUTES = 18 * 60;

export function isWeekendDate(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export function setDateToWorkdayStart(d: Date): Date {
  d.setHours(9, 0, 0, 0);
  return d;
}

function setDateToFridayEnd(d: Date): Date {
  d.setHours(18, 0, 0, 0);
  return d;
}

export function advanceToMondayFromSaturday(d: Date): Date {
  d.setDate(d.getDate() + 2);
  return setDateToWorkdayStart(d);
}

export function advanceToMondayFromSunday(d: Date): Date {
  d.setDate(d.getDate() + 1);
  return setDateToWorkdayStart(d);
}

export function advanceToNextWorkdayAfterHours(d: Date, dayOfWeek: number): Date {
  if (dayOfWeek === 5) {
    d.setDate(d.getDate() + 3);
  } else {
    d.setDate(d.getDate() + 1);
  }
  return setDateToWorkdayStart(d);
}

export function getFridayEndOfDayFromWeekday(d: Date, dayOfWeek: number): Date | null {
  if (dayOfWeek === 5) {
    return setDateToFridayEnd(d);
  }
  if (dayOfWeek === 6) {
    d.setDate(d.getDate() - 1);
    return setDateToFridayEnd(d);
  }
  if (dayOfWeek === 0) {
    d.setDate(d.getDate() - 2);
    return setDateToFridayEnd(d);
  }
  return null;
}

export function getNextWorkingDayFromWeekend(d: Date, dayOfWeek: number): Date | null {
  if (dayOfWeek === 6) {
    return advanceToMondayFromSaturday(d);
  }
  if (dayOfWeek === 0) {
    return advanceToMondayFromSunday(d);
  }
  return null;
}

export function addWorkingHoursForDay(
  total: number,
  startMs: number,
  endMs: number,
  dayStartMs: number,
  dayEndMs: number
): number {
  const effectiveStart = Math.max(startMs, dayStartMs);
  const effectiveEnd = Math.min(endMs, dayEndMs);
  if (effectiveEnd <= effectiveStart) {
    return total;
  }
  return total + (effectiveEnd - effectiveStart);
}

const MAX_WORKING_DAYS_FOR_WEEKEND_LOOKUP = 200;

export function getMondayIndexForWeekend(
  sprintStartDate: Date,
  workingDaysCount: number,
  getWorkingDaysRange: (startDate: Date, count: number) => Date[],
  isWeekend: (date: Date) => boolean
): number | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!isWeekend(today)) return null;

  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + (today.getDay() === 6 ? 2 : 1));
  nextMonday.setHours(0, 0, 0, 0);

  const scan = Math.min(Math.max(1, workingDaysCount), MAX_WORKING_DAYS_FOR_WEEKEND_LOOKUP);
  const days = getWorkingDaysRange(sprintStartDate, scan);
  for (let i = 0; i < days.length; i++) {
    const d = new Date(days[i]!);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === nextMonday.getTime()) return i;
  }

  return null;
}

export function diffDaysFromToday(dayDate: Date, today: Date): number {
  const diffTime = dayDate.getTime() - today.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function classifyDayStatusFromDiff(diffDays: number): SprintStatus | 'today' {
  if (diffDays < 0) return 'past';
  if (diffDays === 0) return 'today';
  return 'future';
}

export function resolveCurrentDayPartIndex(hours: number, minutes: number): number {
  if (hours < 12 || (hours === 12 && minutes === 0)) {
    return 0;
  }
  if (hours < 15 || (hours === 15 && minutes === 0)) {
    return 1;
  }
  return 2;
}

export function classifyPartStatusForToday(partIndex: number, currentPart: number): SprintStatus {
  if (partIndex < currentPart) return 'past';
  if (partIndex === currentPart) return 'current';
  return 'future';
}

export function resolveMondayPartStatus(
  mondayIndex: number | null,
  dayIndex: number,
  partIndex: number
): SprintStatus | null {
  if (mondayIndex === null || dayIndex !== mondayIndex) {
    return null;
  }
  return partIndex === 0 ? 'current' : 'future';
}

export function findTodayWorkingDayIndex(
  range: Date[],
  today: Date
): number {
  for (let i = 0; i < range.length; i++) {
    const dayDate = new Date(range[i]!);
    dayDate.setHours(0, 0, 0, 0);
    if (dayDate.getTime() === today.getTime()) {
      return i;
    }
  }
  return -1;
}

export function resolveSprintTimelineWorkingDaysCount(
  startStr: string | null | undefined,
  endStr: string | null | undefined,
  fallback: number,
  countWorkingDaysInclusiveCalendarRange: (start: Date, end: Date) => number
): number {
  if (!startStr || !endStr) return fallback;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return fallback;
  const n = countWorkingDaysInclusiveCalendarRange(start, end);
  return n > 0 ? n : fallback;
}

