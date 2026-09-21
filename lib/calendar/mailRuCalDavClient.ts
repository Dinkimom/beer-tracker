import {
  calendarEventInstanceKey,
  type CalDavCredentialsInput,
  type ParsedCalendarEvent,
} from './calendarEventTypes';
import { dateToCalDavUtcString } from './dateToCalDavUtcString';
import { expandRecurringCalendarEvents } from './expandRecurringCalendarEvents';
import { extractIcsFromCalDavMultistatus } from './extractIcsFromCalDavMultistatus';
import { parseIcsCalendarData } from './parseIcsCalendarData';

function buildCalendarQueryXml(start: Date, end: Date): string {
  const startStr = dateToCalDavUtcString(start);
  const endStr = dateToCalDavUtcString(end);
  // expand — если сервер поддерживает, отдаёт экземпляры; иначе разворачиваем RRULE сами
  return `<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data>
      <C:expand start="${startStr}" end="${endStr}"/>
    </C:calendar-data>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${startStr}" end="${endStr}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;
}

function basicAuthHeader(email: string, appPassword: string): string {
  const token = Buffer.from(`${email}:${appPassword}`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

function isBusyEvent(event: ParsedCalendarEvent): boolean {
  return event.status !== 'cancelled' && !event.transparent;
}

function collectParsedBusyEvents(icsBlocks: string[]): ParsedCalendarEvent[] {
  const byInstance = new Map<string, ParsedCalendarEvent>();
  for (const block of icsBlocks) {
    for (const event of parseIcsCalendarData(block)) {
      if (!isBusyEvent(event)) continue;
      byInstance.set(calendarEventInstanceKey(event), event);
    }
  }
  return [...byInstance.values()];
}

function dedupeBusyEvents(events: ParsedCalendarEvent[]): ParsedCalendarEvent[] {
  const deduped = new Map<string, ParsedCalendarEvent>();
  for (const event of events) {
    if (!isBusyEvent(event)) continue;
    deduped.set(calendarEventInstanceKey(event), event);
  }
  return [...deduped.values()].sort((a, b) => a.startMs - b.startMs);
}

export async function fetchCalDavCalendarEvents(
  credentials: CalDavCredentialsInput,
  rangeStart: Date,
  rangeEnd: Date
): Promise<ParsedCalendarEvent[]> {
  const body = buildCalendarQueryXml(rangeStart, rangeEnd);
  const response = await fetch(credentials.caldavUrl, {
    method: 'REPORT',
    headers: {
      Authorization: basicAuthHeader(credentials.email, credentials.appPassword),
      'Content-Type': 'application/xml; charset=utf-8',
      Depth: '1',
    },
    body,
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      detail.includes('unauthorized') || response.status === 401
        ? 'calendars.caldavUnauthorized'
        : 'calendars.caldavFetchFailed'
    );
  }

  const xml = await response.text();
  const parsed = collectParsedBusyEvents(extractIcsFromCalDavMultistatus(xml));
  const expanded = expandRecurringCalendarEvents(
    parsed,
    rangeStart.getTime(),
    rangeEnd.getTime()
  );
  return dedupeBusyEvents(expanded);
}
