import type { CalendarBusyEventItem } from './calendarEventTypes';

import { CALENDAR_DEFAULT_TIME_ZONE } from './icsDateTimeParse';

function formatCalendarBusyClock(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    timeZone: CALENDAR_DEFAULT_TIME_ZONE,
  }).format(new Date(ms));
}

export function formatCalendarBusyTimeRange(event: CalendarBusyEventItem): string {
  return `${formatCalendarBusyClock(event.startMs)}–${formatCalendarBusyClock(event.endMs)}`;
}
