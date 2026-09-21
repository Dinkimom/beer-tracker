/** Часовой пояс по умолчанию для floating-дат Mail.ru CalDAV (сервер часто в UTC). */
export const CALENDAR_DEFAULT_TIME_ZONE = 'Europe/Moscow';

interface IcsDateTimeParts {
  day: number;
  hour: number;
  minute: number;
  month: number;
  second: number;
  year: number;
}

function readFormatPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes
): number {
  return Number(parts.find((part) => part.type === type)?.value ?? NaN);
}

/**
 * Смещение зоны: localWallAsUtcMs - utcMs.
 * Для Europe/Moscow обычно +3ч.
 */
function getTimeZoneOffsetMs(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(date);

  let hour = readFormatPart(parts, 'hour');
  if (hour === 24) hour = 0;

  const asIfUtc = Date.UTC(
    readFormatPart(parts, 'year'),
    readFormatPart(parts, 'month') - 1,
    readFormatPart(parts, 'day'),
    hour,
    readFormatPart(parts, 'minute'),
    readFormatPart(parts, 'second')
  );
  return asIfUtc - date.getTime();
}

/** Стена времени в `timeZone` → UTC epoch ms. */
function zonedWallTimeToUtcMs(
  parts: IcsDateTimeParts,
  timeZone: string
): number {
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  let instant = utcGuess;
  for (let i = 0; i < 3; i += 1) {
    const offset = getTimeZoneOffsetMs(timeZone, new Date(instant));
    instant = utcGuess - offset;
  }
  return instant;
}

function extractIcsTzid(params: string): string | undefined {
  const match = /TZID="?([^";]+)"?/i.exec(params);
  if (!match?.[1]) return undefined;
  // CalDAV иногда отдаёт /Europe/Moscow
  return match[1].replace(/^\//, '').trim();
}

function parseIcsDateTimeParts(value: string): IcsDateTimeParts | null {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?Z?$/i.exec(value.trim());
  if (!match) return null;
  return {
    day: Number(match[3]),
    hour: Number(match[4] ?? 0),
    minute: Number(match[5] ?? 0),
    month: Number(match[2]),
    second: Number(match[6] ?? 0),
    year: Number(match[1]),
  };
}

/**
 * Парсит ICS DATE / DATE-TIME с учётом TZID / Z / floating.
 * Floating и DATE без TZID → Europe/Moscow (Mail.ru + сервер в UTC).
 */
export function parseIcsDateValue(
  value: string,
  params: string
): { allDay: boolean; ms: number } {
  const trimmed = value.trim();
  const allDay = /VALUE=DATE/i.test(params) || /^\d{8}$/.test(trimmed);
  const parts = parseIcsDateTimeParts(trimmed);
  if (!parts) {
    return { allDay, ms: NaN };
  }

  const tzid = extractIcsTzid(params);

  if (allDay) {
    const zone = tzid ?? CALENDAR_DEFAULT_TIME_ZONE;
    return {
      allDay: true,
      ms: zonedWallTimeToUtcMs({ ...parts, hour: 9, minute: 0, second: 0 }, zone),
    };
  }

  if (trimmed.endsWith('Z')) {
    return {
      allDay: false,
      ms: Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second
      ),
    };
  }

  const zone = tzid ?? CALENDAR_DEFAULT_TIME_ZONE;
  return {
    allDay: false,
    ms: zonedWallTimeToUtcMs(parts, zone),
  };
}

/** 18:00 того же календарного дня в зоне события (по UTC instant). */
export function endOfWorkdayInTimeZoneMs(
  dateMs: number,
  timeZone: string = CALENDAR_DEFAULT_TIME_ZONE
): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hourCycle: 'h23',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(new Date(dateMs));

  return zonedWallTimeToUtcMs(
    {
      day: readFormatPart(parts, 'day'),
      hour: 18,
      minute: 0,
      month: readFormatPart(parts, 'month'),
      second: 0,
      year: readFormatPart(parts, 'year'),
    },
    timeZone
  );
}

/**
 * Instant → Date с локальными Y/M/D H:M:S = стена времени в `timeZone`.
 * Нужен для `dateTimeToFractionalCell*` / `getHours()`, чтобы занятость
 * считалась по рабочему дню 9–18 в зоне календаря, а не по TZ рантайма (UTC в Docker).
 */
export function calendarInstantToPlannerLocalDate(
  dateMs: number,
  timeZone: string = CALENDAR_DEFAULT_TIME_ZONE
): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(new Date(dateMs));

  let hour = readFormatPart(parts, 'hour');
  if (hour === 24) hour = 0;

  return new Date(
    readFormatPart(parts, 'year'),
    readFormatPart(parts, 'month') - 1,
    readFormatPart(parts, 'day'),
    hour,
    readFormatPart(parts, 'minute'),
    readFormatPart(parts, 'second')
  );
}

export function addCalendarDaysInTimeZoneMs(
  dateMs: number,
  days: number,
  timeZone: string = CALENDAR_DEFAULT_TIME_ZONE
): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(new Date(dateMs));

  const wall = {
    day: readFormatPart(parts, 'day') + days,
    hour: readFormatPart(parts, 'hour'),
    minute: readFormatPart(parts, 'minute'),
    month: readFormatPart(parts, 'month'),
    second: readFormatPart(parts, 'second'),
    year: readFormatPart(parts, 'year'),
  };
  // Нормализуем через Date.UTC overflow (месяц/день)
  const normalized = new Date(
    Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second)
  );
  return zonedWallTimeToUtcMs(
    {
      day: normalized.getUTCDate(),
      hour: normalized.getUTCHours(),
      minute: normalized.getUTCMinutes(),
      month: normalized.getUTCMonth() + 1,
      second: normalized.getUTCSeconds(),
      year: normalized.getUTCFullYear(),
    },
    timeZone
  );
}
