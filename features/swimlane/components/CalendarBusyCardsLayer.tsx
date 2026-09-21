'use client';

import type { CalendarBusySegment } from '@/lib/calendar/calendarEventTypes';

import { CalendarBusyCard } from '@/features/swimlane/components/CalendarBusyCard';
import { getLeftPercentForSegmentStartCell } from '@/features/swimlane/utils/positionUtils';

interface CalendarBusyCardsLayerProps {
  segments: CalendarBusySegment[];
  totalHeight: number;
  totalParts: number;
}

export function CalendarBusyCardsLayer({
  segments,
  totalHeight,
  totalParts,
}: CalendarBusyCardsLayerProps) {
  if (segments.length === 0) return null;

  return (
    <div className="relative h-full w-full">
      {segments.map((segment) => {
        const widthParts = segment.endCell - segment.startCell;
        const leftPercent = getLeftPercentForSegmentStartCell(segment.startCell, totalParts);
        const widthPercent = (widthParts / totalParts) * 100;

        return (
          <CalendarBusyCard
            key={segment.uid}
            leftPercent={leftPercent}
            segment={segment}
            totalHeight={totalHeight}
            widthPercent={widthPercent}
          />
        );
      })}
    </div>
  );
}
