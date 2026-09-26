const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

interface CompactDateParts {
  day: number;
  month: number;
  year: number;
}

function parseCompactDate(value: string): CompactDateParts | null {
  if (!/^\d{8}$/.test(value)) {
    return null;
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const utc = Date.UTC(year, month - 1, day);
  const check = new Date(utc);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return { day, month, year };
}

/** Число календарных дней включительно. null — невалидный или слишком длинный диапазон. */
export function calendarDayCount(date1: string, date2: string): number | null {
  const start = parseCompactDate(date1);
  const end = parseCompactDate(date2);
  if (!start || !end) {
    return null;
  }
  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);
  if (endUtc < startUtc) {
    return null;
  }
  const days = Math.round((endUtc - startUtc) / DAY_MS) + 1;
  if (days > MAX_RANGE_DAYS) {
    return null;
  }
  return days;
}

export function isCompactDateRange(date1: string, date2: string): boolean {
  return calendarDayCount(date1, date2) != null;
}

export function yearsInCompactRange(date1: string, date2: string): number[] {
  const start = parseCompactDate(date1);
  const end = parseCompactDate(date2);
  if (!start || !end || end.year < start.year) {
    return [];
  }
  const years: number[] = [];
  for (let year = start.year; year <= end.year; year += 1) {
    years.push(year);
  }
  return years;
}

/** Строка кодов isdayoff: 0 рабочий, 1 выходной, 2 сокращённый, 4 ковид, 8 праздник. */
export function isDayCodeString(text: string, expectedLength: number): boolean {
  return text.length === expectedLength && /^[01248]+$/.test(text);
}

/**
 * Коды в том же формате, что isdayoff (`holiday=1`): 8 — праздник, 1 — сб/вс, 0 — рабочий будень.
 * Индексация по календарным дням нужна клиенту, который считает смещение от первого рабочего дня.
 */
export function buildPublicHolidayDayCodes(
  date1: string,
  date2: string,
  holidayIsoDates: ReadonlySet<string>
): string | null {
  const count = calendarDayCount(date1, date2);
  const start = parseCompactDate(date1);
  if (count == null || !start) {
    return null;
  }
  let cursor = Date.UTC(start.year, start.month - 1, start.day);
  let out = '';
  for (let i = 0; i < count; i += 1) {
    const date = new Date(cursor);
    const iso = date.toISOString().slice(0, 10);
    const dayOfWeek = date.getUTCDay();
    const weekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (holidayIsoDates.has(iso)) {
      out += '8';
    } else if (weekend) {
      out += '1';
    } else {
      out += '0';
    }
    cursor += DAY_MS;
  }
  return out;
}
