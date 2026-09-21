'use client';

import type { CalendarBusySegment } from '@/lib/calendar/calendarEventTypes';

import { TextTooltip } from '@/components/TextTooltip';
import { PARTS_PER_DAY } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { CalendarBusyTooltipList } from '@/features/swimlane/components/CalendarBusyTooltipList';

/**
 * Боковой inset только у границы дня (не CARD_MARGIN: час ≈ ⅓ слота ≈ 12–20px,
 * полный card-margin съедал почти всю ширину).
 */
const CALENDAR_BUSY_DAY_EDGE_INSET_PX = 1;

interface CalendarBusyCardProps {
  leftPercent: number;
  segment: CalendarBusySegment;
  totalHeight: number;
  widthPercent: number;
}

/** Ячейка лежит на границе рабочего дня (0 / PARTS_PER_DAY / …). */
function cellOnDayBoundary(cell: number): boolean {
  const rem = ((cell % PARTS_PER_DAY) + PARTS_PER_DAY) % PARTS_PER_DAY;
  return rem < 1e-4 || Math.abs(rem - PARTS_PER_DAY) < 1e-4;
}

export function CalendarBusyCard({
  leftPercent,
  segment,
  totalHeight,
  widthPercent,
}: CalendarBusyCardProps) {
  const { t } = useI18n();
  const eventCount = segment.events.length;
  const ariaLabel =
    eventCount === 1
      ? t('sprintPlanner.swimlane.calendar.busyBlockAria', {
          summary: segment.events[0]?.summary ?? '',
        })
      : t('sprintPlanner.swimlane.calendar.busyBlockAriaMany', {
          count: String(eventCount),
        });

  const startInsetPx = cellOnDayBoundary(segment.startCell)
    ? CALENDAR_BUSY_DAY_EDGE_INSET_PX
    : 0;
  const endInsetPx = cellOnDayBoundary(segment.endCell) ? CALENDAR_BUSY_DAY_EDGE_INSET_PX : 0;
  const widthCss =
    startInsetPx + endInsetPx > 0
      ? `calc(${widthPercent}% - ${startInsetPx + endInsetPx}px)`
      : `${widthPercent}%`;

  return (
    <TextTooltip
      content={<CalendarBusyTooltipList events={segment.events} />}
      contentClassName="max-w-sm"
      delayDuration={120}
      side="top"
      sideOffset={8}
    >
      <div
        aria-label={ariaLabel}
        className="absolute top-0 box-border cursor-default rounded-sm border-2 border-sky-500/40 bg-sky-100/90 outline-none transition-[background-color,border-color] duration-150 hover:border-sky-600/55 hover:bg-sky-200/90 dark:border-sky-400/30 dark:bg-sky-900/55 dark:hover:border-sky-300/45 dark:hover:bg-sky-800/65"
        role="img"
        style={{
          height: totalHeight,
          left: `calc(${leftPercent}% + ${startInsetPx}px)`,
          width: widthCss,
        }}
      />
    </TextTooltip>
  );
}
