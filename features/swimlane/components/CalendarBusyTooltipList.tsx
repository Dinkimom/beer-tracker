'use client';

import type { CalendarBusyEventItem } from '@/lib/calendar/calendarEventTypes';

import { CALENDAR_DEFAULT_TIME_ZONE } from '@/lib/calendar/icsDateTimeParse';

function formatCalendarBusyClock(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    timeZone: CALENDAR_DEFAULT_TIME_ZONE,
  }).format(new Date(ms));
}

function formatCalendarBusyTimeRange(event: CalendarBusyEventItem): string {
  return `${formatCalendarBusyClock(event.startMs)}–${formatCalendarBusyClock(event.endMs)}`;
}

interface CalendarBusyTooltipListProps {
  events: CalendarBusyEventItem[];
}

export function CalendarBusyTooltipList({ events }: CalendarBusyTooltipListProps) {
  return (
    <ul className="m-0 max-h-56 max-w-xs list-none space-y-0.5 overflow-y-auto p-0 text-left">
      {events.map((event) => (
        <li key={event.uid} className="px-1.5 py-1 leading-snug">
          <div className="font-medium">{event.summary}</div>
          <div className="text-[11px] opacity-80">{formatCalendarBusyTimeRange(event)}</div>
        </li>
      ))}
    </ul>
  );
}
