import type { AvailabilitySegment } from './availabilitySegments';
import type { AvailabilityCardKind } from '@/features/swimlane/utils/availabilityCardKind';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { getPartsPerDay } from '@/constants';

function formatDDMM(d: Date): string {
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}`;
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = formatDDMM(new Date(startDate));
  const end = formatDDMM(new Date(endDate));
  return start === end ? start : `${start}–${end}`;
}

export function boardEventToKind(ev: BoardAvailabilityEvent): AvailabilityCardKind {
  switch (ev.eventType) {
    case 'duty':
      return 'duty';
    case 'sick_leave':
      return 'sick_leave';
    case 'vacation':
      return 'vacation';
    case 'tech_sprint': {
      const t = ev.techSprintSubtype;
      if (t === 'web') return 'tech-sprint-web';
      if (t === 'back') return 'tech-sprint-back';
      return 'tech-sprint-qa';
    }
    default:
      return 'vacation';
  }
}

export function collectOverlappingDayIndices(
  workingDays: Date[],
  entry: BoardAvailabilityEvent,
  dayOverlapsEntry: (dayDate: Date, event: BoardAvailabilityEvent) => boolean
): number[] {
  const overlappingDays: number[] = [];
  for (let dayIndex = 0; dayIndex < workingDays.length; dayIndex++) {
    if (dayOverlapsEntry(workingDays[dayIndex]!, entry)) {
      overlappingDays.push(dayIndex);
    }
  }
  return overlappingDays;
}

export function buildAvailabilitySegmentFromEntry(
  entry: BoardAvailabilityEvent,
  overlappingDays: number[],
  kind: AvailabilityCardKind
): AvailabilitySegment | null {
  if (overlappingDays.length === 0) return null;
  const firstDay = Math.min(...overlappingDays);
  const lastDay = Math.max(...overlappingDays);
  return {
    dateRangeLabel: formatDateRange(entry.startDate, entry.endDate),
    dayIndices: overlappingDays,
    durationInParts: (lastDay - firstDay + 1) * getPartsPerDay(),
    eventId: entry.id,
    kind,
    startDay: firstDay,
  };
}
