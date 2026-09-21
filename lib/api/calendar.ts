import type { ParsedCalendarEvent } from '@/lib/calendar/calendarEventTypes';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

interface FetchCalDavCalendarEventsParams {
  appPassword: string;
  caldavUrl: string;
  email: string;
  timeMax: string;
  timeMin: string;
}

export async function fetchCalDavCalendarEventsFromApi(
  params: FetchCalDavCalendarEventsParams,
  signal?: AbortSignal
): Promise<ParsedCalendarEvent[]> {
  const { data } = await getPlannerBeerTrackerApi().post<{ events: ParsedCalendarEvent[] }>(
    '/calendar/caldav/events',
    params,
    { signal }
  );
  return Array.isArray(data.events) ? data.events : [];
}
