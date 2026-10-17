import type { AvailabilityCardKind } from '@/features/swimlane/utils/availabilityCardKind';
import type { AvailabilitySegment } from '@/features/swimlane/utils/availabilitySegments';

import { formatLocalDateToIsoDateOnly } from '@/lib/isoDateOnlyCalendar';
import { getWorkingDaysRange } from '@/utils/dateUtils';

export function buildUnavailableDayTitles(
  segments: AvailabilitySegment[],
  labelForKind: (kind: AvailabilityCardKind) => string
): Map<number, string> {
  const titles = new Map<number, string[]>();
  for (const segment of segments) {
    const label = `${labelForKind(segment.kind)} — ${segment.dateRangeLabel}`;
    for (const dayIndex of segment.dayIndices) {
      const list = titles.get(dayIndex) ?? [];
      list.push(label);
      titles.set(dayIndex, list);
    }
  }
  const unique = new Map<number, string>();
  for (const [dayIndex, list] of titles) {
    unique.set(dayIndex, [...new Set(list)].join(', '));
  }
  return unique;
}

const HATCH_KIND_PRIORITY: Record<AvailabilityCardKind, number> = {
  sick_leave: 0,
  vacation: 1,
  duty: 2,
  'tech-sprint-qa': 3,
  'tech-sprint-web': 4,
  'tech-sprint-back': 5,
};

export function pickAvailabilityHatchKind(
  kinds: readonly AvailabilityCardKind[]
): AvailabilityCardKind {
  return kinds.reduce((best, kind) =>
    HATCH_KIND_PRIORITY[kind] < HATCH_KIND_PRIORITY[best] ? kind : best
  );
}

export function buildUnavailableDayHatchKinds(
  segments: AvailabilitySegment[]
): Map<number, AvailabilityCardKind> {
  const kindsByDay = new Map<number, AvailabilityCardKind[]>();
  for (const segment of segments) {
    for (const dayIndex of segment.dayIndices) {
      const list = kindsByDay.get(dayIndex) ?? [];
      list.push(segment.kind);
      kindsByDay.set(dayIndex, list);
    }
  }
  const result = new Map<number, AvailabilityCardKind>();
  for (const [dayIndex, kinds] of kindsByDay) {
    result.set(dayIndex, pickAvailabilityHatchKind(kinds));
  }
  return result;
}

interface UnavailableHatchRange {
  daySpan: number;
  kind: AvailabilityCardKind;
  startDay: number;
}

export function buildUnavailableHatchRanges(
  kinds: ReadonlyMap<number, AvailabilityCardKind> | undefined,
  dayCount: number
): UnavailableHatchRange[] {
  if (!kinds || kinds.size === 0 || dayCount < 1) {
    return [];
  }
  const ranges: UnavailableHatchRange[] = [];
  let dayIndex = 0;
  while (dayIndex < dayCount) {
    const kind = kinds.get(dayIndex);
    if (!kind) {
      dayIndex += 1;
      continue;
    }
    let daySpan = 1;
    while (dayIndex + daySpan < dayCount && kinds.get(dayIndex + daySpan) === kind) {
      daySpan += 1;
    }
    ranges.push({ daySpan, kind, startDay: dayIndex });
    dayIndex += daySpan;
  }
  return ranges;
}

/**
 * Day-разделитель справа от dayIndex внутри одного непрерывного блока занятости
 * (оба дня недоступны и одного kind). Между разными событиями границу оставляем.
 */
export function isInternalAvailabilityDayDivider(
  kinds: ReadonlyMap<number, AvailabilityCardKind> | undefined,
  dayIndex: number,
  dayCount: number
): boolean {
  if (!kinds || dayIndex < 0 || dayIndex >= dayCount - 1) {
    return false;
  }
  const left = kinds.get(dayIndex);
  const right = kinds.get(dayIndex + 1);
  return left != null && right != null && left === right;
}

interface HolidayHatchRange {
  daySpan: number;
  startDay: number;
}

function isHolidayHatchDay(
  dayIndex: number,
  holidayDayIndices: ReadonlySet<number> | undefined,
  unavailableKinds: ReadonlyMap<number, AvailabilityCardKind> | undefined
): boolean {
  return Boolean(
    holidayDayIndices?.has(dayIndex) && !unavailableKinds?.has(dayIndex)
  );
}

/** Непрерывные выходные/праздники без перекрытия отсутствием — одна полоса паттерна. */
export function buildHolidayHatchRanges(
  holidayDayIndices: ReadonlySet<number> | undefined,
  unavailableKinds: ReadonlyMap<number, AvailabilityCardKind> | undefined,
  dayCount: number
): HolidayHatchRange[] {
  if (!holidayDayIndices || holidayDayIndices.size === 0 || dayCount < 1) {
    return [];
  }
  const ranges: HolidayHatchRange[] = [];
  let dayIndex = 0;
  while (dayIndex < dayCount) {
    if (!isHolidayHatchDay(dayIndex, holidayDayIndices, unavailableKinds)) {
      dayIndex += 1;
      continue;
    }
    let daySpan = 1;
    while (
      dayIndex + daySpan < dayCount &&
      isHolidayHatchDay(dayIndex + daySpan, holidayDayIndices, unavailableKinds)
    ) {
      daySpan += 1;
    }
    ranges.push({ daySpan, startDay: dayIndex });
    dayIndex += daySpan;
  }
  return ranges;
}

/**
 * Day-разделитель справа от dayIndex внутри сплошного блока выходных
 * (оба дня праздник/выходной и без отсутствия).
 */
export function isInternalHolidayDayDivider(
  holidayDayIndices: ReadonlySet<number> | undefined,
  unavailableKinds: ReadonlyMap<number, AvailabilityCardKind> | undefined,
  dayIndex: number,
  dayCount: number
): boolean {
  if (dayIndex < 0 || dayIndex >= dayCount - 1) {
    return false;
  }
  return (
    isHolidayHatchDay(dayIndex, holidayDayIndices, unavailableKinds) &&
    isHolidayHatchDay(dayIndex + 1, holidayDayIndices, unavailableKinds)
  );
}

export function isoDateOnlyFromWorkingDayIndex(
  sprintStartDate: Date,
  dayIndex: number,
  workingDaysCount: number
): string | null {
  if (dayIndex < 0) {
    return null;
  }
  const days = getWorkingDaysRange(sprintStartDate, Math.max(1, workingDaysCount));
  const day = days[dayIndex];
  return day ? formatLocalDateToIsoDateOnly(day) : null;
}
