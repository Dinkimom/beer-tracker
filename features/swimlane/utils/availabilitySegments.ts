import type { AvailabilityCardKind } from '@/features/swimlane/utils/availabilityCardKind';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { WORKING_DAYS } from '@/constants';
import { getWorkingDaysRange } from '@/utils/dateUtils';

import {
  boardEventToKind,
  buildAvailabilitySegmentFromEntry,
  collectOverlappingDayIndices,
} from './availabilitySegmentsHelpers';

function normalizeDayStart(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function normalizeDayEnd(d: Date): number {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.getTime();
}

function parseIsoDateOnlyUtc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function dayOverlapsEntry(dayDate: Date, entry: BoardAvailabilityEvent): boolean {
  const dayStart = normalizeDayStart(dayDate);
  const dayEnd = normalizeDayEnd(dayDate);
  const entryStart = normalizeDayStart(parseIsoDateOnlyUtc(entry.startDate));
  const entryEnd = normalizeDayEnd(parseIsoDateOnlyUtc(entry.endDate));
  return entryStart <= dayEnd && entryEnd >= dayStart;
}

export interface AvailabilitySegment {
  dateRangeLabel: string;
  dayIndices: number[];
  durationInParts: number;
  eventId: string;
  kind: AvailabilityCardKind;
  startDay: number;
}

export function getSegmentsForDeveloper(
  developerId: string,
  sprintStartDate: Date,
  boardEvents: BoardAvailabilityEvent[],
  workingDaysCount: number = WORKING_DAYS
): AvailabilitySegment[] {
  const count = Math.max(1, workingDaysCount);
  const workingDays = getWorkingDaysRange(sprintStartDate, count);
  const segments: AvailabilitySegment[] = [];

  const entries = boardEvents.filter((v) => v.memberId === developerId);

  for (const entry of entries) {
    const kind = boardEventToKind(entry);
    const overlappingDays = collectOverlappingDayIndices(workingDays, entry, dayOverlapsEntry);
    const segment = buildAvailabilitySegmentFromEntry(entry, overlappingDays, kind);
    if (segment) segments.push(segment);
  }

  return segments;
}
