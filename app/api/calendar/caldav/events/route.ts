import { NextRequest, NextResponse } from 'next/server';

import { parseCalDavEventsRequestBody } from '@/lib/calendar/calDavEventsRouteHelpers';
import { fetchCalDavCalendarEvents } from '@/lib/calendar/mailRuCalDavClient';

/**
 * POST /api/calendar/caldav/events
 * Прокси CalDAV REPORT (Mail.ru) — credentials в теле запроса с клиента (localStorage POC).
 */
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = parseCalDavEventsRequestBody(body);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const events = await fetchCalDavCalendarEvents(
      {
        appPassword: parsed.appPassword,
        caldavUrl: parsed.caldavUrl,
        email: parsed.email,
      },
      new Date(parsed.timeMin),
      new Date(parsed.timeMax)
    );

    return NextResponse.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'calendars.caldavFetchFailed';
    const status = message === 'calendars.caldavUnauthorized' ? 401 : 502;
    console.error('[api/calendar/caldav/events]', error);
    return NextResponse.json({ error: message }, { status });
  }
}
