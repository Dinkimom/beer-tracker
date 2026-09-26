'use client';

import {
  plannerNowFromMinute,
  usePlannerNowMinute,
} from '@/features/sprint/hooks/usePlannerNowMinute';
import {
  plannerNowLineLeftPercent,
  plannerNowWithinDay,
} from '@/features/sprint/utils/timelineColumnChrome';
import { getDayDate } from '@/lib/planner-timeline/occupancyUtils';
import { getDayStatus } from '@/utils/dateUtils';

function findTodayDayIndex(sprintStartDate: Date, dayCount: number): number {
  for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
    if (getDayStatus(dayIndex, sprintStartDate, dayCount) === 'today') return dayIndex;
  }
  return -1;
}

/** Вертикальная линия текущего времени поверх таймлайна, без заливки слота. */
export function PlannerNowLine({
  dayCount,
  participantsColumnWidth,
  sprintStartDate,
}: {
  dayCount: number;
  participantsColumnWidth: number;
  sprintStartDate: Date;
}) {
  const now = plannerNowFromMinute(usePlannerNowMinute());
  const count = Math.max(1, dayCount);
  const dayIndex = findTodayDayIndex(sprintStartDate, count);
  if (dayIndex < 0) return null;

  const withinDay = plannerNowWithinDay(getDayDate(sprintStartDate, dayIndex, count), now);
  const share = plannerNowLineLeftPercent(dayIndex, count, withinDay) / 100;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-0 top-0 z-[1] w-px -translate-x-1/2 bg-blue-500 dark:bg-blue-400"
      data-planner-now-line
      style={{
        left: `calc(${participantsColumnWidth}px + (100% - ${participantsColumnWidth}px) * ${share})`,
      }}
    />
  );
}
