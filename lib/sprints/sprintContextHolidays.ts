import type {
  SprintContextCalendarDay,
  SprintContextHolidayDay,
} from '@/lib/sprints/sprintContextTypes';

import { fetchHolidayDayCodes } from '@/lib/holidays/fetchHolidayDayCodes';
import {
  DEFAULT_HOLIDAY_COUNTRY,
  type HolidayCountryCode,
} from '@/lib/holidays/holidayCountries';

const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD → YYYYMMDD for isdayoff / Nager range APIs. */
export function isoDateToCompact(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.slice(0, 10));
  if (!match) {
    return null;
  }
  return `${match[1]}${match[2]}${match[3]}`;
}

/**
 * Map isdayoff-style day codes onto planner working-day indices.
 * Codes cover every calendar day from the first to last calendarDay date;
 * only codes `1` (non-working) and `8` (holiday) on Mon–Fri columns count.
 */
export function buildSprintContextHolidayDays(
  calendarDays: readonly SprintContextCalendarDay[],
  dayCodes: string
): SprintContextHolidayDay[] {
  if (calendarDays.length === 0 || !dayCodes) {
    return [];
  }
  const first = calendarDays[0]!;
  const firstUtc = Date.parse(`${first.date}T00:00:00.000Z`);
  if (Number.isNaN(firstUtc)) {
    return [];
  }
  const holidays: SprintContextHolidayDay[] = [];
  for (const day of calendarDays) {
    const dayUtc = Date.parse(`${day.date}T00:00:00.000Z`);
    if (Number.isNaN(dayUtc)) {
      continue;
    }
    const offset = Math.round((dayUtc - firstUtc) / DAY_MS);
    if (offset < 0 || offset >= dayCodes.length) {
      continue;
    }
    const code = dayCodes[offset];
    if (code === '1' || code === '8') {
      holidays.push({ date: day.date, day: day.day });
    }
  }
  return holidays;
}

export async function loadSprintContextHolidayDays(input: {
  calendarDays: readonly SprintContextCalendarDay[];
  country?: HolidayCountryCode;
}): Promise<{ holidayDays: SprintContextHolidayDay[]; warning?: string }> {
  const { calendarDays } = input;
  if (calendarDays.length === 0) {
    return { holidayDays: [] };
  }
  const date1 = isoDateToCompact(calendarDays[0]!.date);
  const date2 = isoDateToCompact(calendarDays[calendarDays.length - 1]!.date);
  if (!date1 || !date2) {
    return {
      holidayDays: [],
      warning: 'holidays_unavailable: could not map calendar dates for holiday lookup',
    };
  }
  const country = input.country ?? DEFAULT_HOLIDAY_COUNTRY;
  try {
    const codes = await fetchHolidayDayCodes(date1, date2, country);
    if (!codes) {
      return {
        holidayDays: [],
        warning: `holidays_unavailable: no holiday calendar for ${country} (${date1}–${date2})`,
      };
    }
    return { holidayDays: buildSprintContextHolidayDays(calendarDays, codes) };
  } catch (error) {
    console.warn('[sprint-context] holidays:', error);
    return {
      holidayDays: [],
      warning: `holidays_unavailable: failed to load holiday calendar for ${country}`,
    };
  }
}

export function holidayDayIndexSet(
  holidayDays: readonly SprintContextHolidayDay[] | undefined
): Set<number> {
  return new Set((holidayDays ?? []).map((item) => item.day));
}
