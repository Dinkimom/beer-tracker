'use client';

import type { CalendarBusySegment } from '@/lib/calendar/calendarEventTypes';

import { CalendarBusyCardsLayer } from '@/features/swimlane/components/CalendarBusyCardsLayer';
import { SwimlaneLaneBand } from '@/features/swimlane/components/SwimlaneLaneBand';

/** Высота самих busy-блоков. */
const CALENDAR_BUSY_LANE_CONTENT_HEIGHT_PX = 26;
/** Отступ над блоками календаря внутри дорожки. */
const CALENDAR_BUSY_LANE_TOP_GAP_PX = 8;
/** Отступ под таймлайном календаря до следующей дорожки / края свимлейна. */
const CALENDAR_BUSY_LANE_BOTTOM_GAP_PX = 10;
/** Полная высота дорожки календаря (отступы + контент). */
export const CALENDAR_BUSY_LANE_HEIGHT_PX =
  CALENDAR_BUSY_LANE_TOP_GAP_PX +
  CALENDAR_BUSY_LANE_CONTENT_HEIGHT_PX +
  CALENDAR_BUSY_LANE_BOTTOM_GAP_PX;

interface SwimlaneCalendarBusyLaneProps {
  calendarBusySegments: CalendarBusySegment[];
  laneTopPx: number;
  totalParts: number;
  visible: boolean;
}

export function SwimlaneCalendarBusyLane({
  calendarBusySegments,
  laneTopPx,
  totalParts,
  visible,
}: SwimlaneCalendarBusyLaneProps) {
  if (!visible || calendarBusySegments.length === 0) {
    return null;
  }

  return (
    <SwimlaneLaneBand
      accent="calendar"
      className="absolute left-0 right-0 z-20 cursor-default"
      style={{ top: laneTopPx, height: CALENDAR_BUSY_LANE_HEIGHT_PX }}
    >
      <div
        style={{
          height: CALENDAR_BUSY_LANE_CONTENT_HEIGHT_PX,
          marginTop: CALENDAR_BUSY_LANE_TOP_GAP_PX,
        }}
      >
        <CalendarBusyCardsLayer
          segments={calendarBusySegments}
          totalHeight={CALENDAR_BUSY_LANE_CONTENT_HEIGHT_PX}
          totalParts={totalParts}
        />
      </div>
    </SwimlaneLaneBand>
  );
}
