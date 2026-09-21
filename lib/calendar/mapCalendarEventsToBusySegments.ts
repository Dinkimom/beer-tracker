import { dateTimeToFractionalCellInRange } from '@/lib/planner-timeline/sprintCellUtils';

import {
  toCalendarBusyEventItem,
  type CalendarBusySegment,
  type ParsedCalendarEvent,
} from './calendarEventTypes';
import { calendarInstantToPlannerLocalDate } from './icsDateTimeParse';

function clipSegmentToTimeline(
  startCell: number,
  endCell: number,
  totalParts: number
): { endCell: number; startCell: number } | null {
  let start = startCell;
  let end = endCell;

  // Если событие целиком в выходных, snap схлопывает start/end — растянем на минимальный слот
  if (start === end && start >= 0 && start < totalParts) {
    end = Math.min(totalParts, start + 0.15);
  }

  if (end <= 0 || start >= totalParts) {
    return null;
  }

  if (end < start) {
    const tmp = start;
    start = end;
    end = tmp;
  }

  const clippedStart = Math.max(0, start);
  const clippedEnd = Math.min(totalParts, Math.max(end, clippedStart + 0.05));
  if (clippedEnd <= clippedStart) {
    return null;
  }
  return { endCell: clippedEnd, startCell: clippedStart };
}

function shouldMergeBusySegments(
  previousEndCell: number,
  nextStartCell: number
): boolean {
  // Пересечение или смежность (конец предыдущего == начало следующего)
  return nextStartCell <= previousEndCell;
}

/** Схлопывает пересекающиеся и смежные сегменты в один блок с списком событий. */
function mergeOverlappingBusySegments(
  segments: CalendarBusySegment[]
): CalendarBusySegment[] {
  if (segments.length === 0) return [];

  const sorted = [...segments].sort((a, b) => {
    if (a.startCell !== b.startCell) return a.startCell - b.startCell;
    return a.endCell - b.endCell;
  });

  const merged: CalendarBusySegment[] = [
    {
      endCell: sorted[0]!.endCell,
      events: [...sorted[0]!.events],
      startCell: sorted[0]!.startCell,
      uid: sorted[0]!.uid,
    },
  ];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i]!;
    const last = merged[merged.length - 1]!;
    if (shouldMergeBusySegments(last.endCell, current.startCell)) {
      last.endCell = Math.max(last.endCell, current.endCell);
      last.events.push(...current.events);
      last.uid = `${last.uid}+${current.uid}`;
      continue;
    }
    merged.push({
      endCell: current.endCell,
      events: [...current.events],
      startCell: current.startCell,
      uid: current.uid,
    });
  }

  for (const segment of merged) {
    segment.events.sort((a, b) => a.startMs - b.startMs || a.uid.localeCompare(b.uid));
  }

  return merged;
}

export function mapCalendarEventsToBusySegments(
  events: ParsedCalendarEvent[],
  sprintStartDate: Date,
  totalParts: number
): CalendarBusySegment[] {
  const segments: CalendarBusySegment[] = [];

  for (const event of events) {
    if (event.status === 'cancelled' || event.transparent) {
      continue;
    }

    const clipped = clipSegmentToTimeline(
      dateTimeToFractionalCellInRange(
        sprintStartDate,
        calendarInstantToPlannerLocalDate(event.startMs),
        totalParts
      ),
      dateTimeToFractionalCellInRange(
        sprintStartDate,
        calendarInstantToPlannerLocalDate(event.endMs),
        totalParts
      ),
      totalParts
    );
    if (!clipped) continue;

    const item = toCalendarBusyEventItem(event);
    segments.push({
      endCell: clipped.endCell,
      events: [item],
      startCell: clipped.startCell,
      uid: item.uid,
    });
  }

  return mergeOverlappingBusySegments(segments);
}
