import {
  hasNagerCalendar,
  prefersIsDayOff,
  type HolidayCountryCode,
} from '@/lib/holidays/holidayCountries';
import {
  buildPublicHolidayDayCodes,
  calendarDayCount,
  isDayCodeString,
  yearsInCompactRange,
} from '@/lib/holidays/holidayDayCodes';

const ISDAYOFF_URL = 'https://isdayoff.ru/api/getdata';
const NAGER_URL = 'https://date.nager.at/api/v3/PublicHolidays';
const REVALIDATE_SECONDS = 86_400;

function fetchInit(accept: string): RequestInit {
  return {
    headers: { Accept: accept },
    next: { revalidate: REVALIDATE_SECONDS },
  };
}

async function readIsDayOff(
  date1: string,
  date2: string,
  country: HolidayCountryCode
): Promise<string | null> {
  const expected = calendarDayCount(date1, date2);
  if (expected == null) {
    return null;
  }
  const url = new URL(ISDAYOFF_URL);
  url.searchParams.set('date1', date1);
  url.searchParams.set('date2', date2);
  url.searchParams.set('cc', country);
  url.searchParams.set('holiday', '1');
  const resp = await fetch(url, fetchInit('text/plain'));
  if (!resp.ok) {
    return null;
  }
  const text = (await resp.text()).trim();
  return isDayCodeString(text, expected) ? text : null;
}

function collectPublicHolidayDates(payload: unknown): Set<string> | null {
  if (!Array.isArray(payload)) {
    return null;
  }
  const dates = new Set<string>();
  for (const item of payload) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const row = item as { date?: unknown; types?: unknown };
    if (typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      continue;
    }
    if (!Array.isArray(row.types) || !row.types.includes('Public')) {
      continue;
    }
    dates.add(row.date);
  }
  return dates;
}

async function readNagerYear(
  year: number,
  country: HolidayCountryCode
): Promise<Set<string> | null> {
  const url = `${NAGER_URL}/${year}/${country.toUpperCase()}`;
  const resp = await fetch(url, fetchInit('application/json'));
  if (!resp.ok) {
    return null;
  }
  const payload: unknown = await resp.json();
  return collectPublicHolidayDates(payload);
}

async function readNagerRange(
  date1: string,
  date2: string,
  country: HolidayCountryCode
): Promise<string | null> {
  if (!hasNagerCalendar(country)) {
    return null;
  }
  const dates = new Set<string>();
  for (const year of yearsInCompactRange(date1, date2)) {
    const yearDates = await readNagerYear(year, country);
    if (!yearDates) {
      return null;
    }
    for (const date of yearDates) {
      dates.add(date);
    }
  }
  return buildPublicHolidayDayCodes(date1, date2, dates);
}

/**
 * Коды дней диапазона.
 * Россия, Беларусь, Казахстан и Узбекистан — isdayoff (переносы производственного календаря).
 * Остальные страны и запасной путь, если isdayoff не ответил, — публичные праздники Nager.Date.
 */
export async function fetchHolidayDayCodes(
  date1: string,
  date2: string,
  country: HolidayCountryCode
): Promise<string | null> {
  if (prefersIsDayOff(country)) {
    const fromIsDayOff = await readIsDayOff(date1, date2, country);
    if (fromIsDayOff) {
      return fromIsDayOff;
    }
  }
  return readNagerRange(date1, date2, country);
}
