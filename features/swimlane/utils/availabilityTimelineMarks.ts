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
