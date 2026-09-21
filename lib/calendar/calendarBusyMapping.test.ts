import type { ParsedCalendarEvent } from './calendarEventTypes';

import { describe, expect, it } from 'vitest';

import { expandRecurringCalendarEvents } from './expandRecurringCalendarEvents';
import { extractIcsFromCalDavMultistatus } from './extractIcsFromCalDavMultistatus';
import { mapCalendarEventsToBusySegments } from './mapCalendarEventsToBusySegments';
import { parseIcsCalendarData } from './parseIcsCalendarData';

function busyFixture(
  overrides: Partial<ParsedCalendarEvent> &
    Pick<ParsedCalendarEvent, 'endMs' | 'startMs' | 'summary' | 'uid'>
): ParsedCalendarEvent {
  return {
    allDay: false,
    attendees: [],
    categories: [],
    exdateMs: [],
    hasRrule: false,
    status: 'confirmed',
    transparent: false,
    ...overrides,
  };
}

describe('parseIcsCalendarData', () => {
  it('parses timed VEVENT', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:evt-1',
      'SUMMARY:Standup',
      'DTSTART:20260717T100000Z',
      'DTEND:20260717T110000Z',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    expect(parseIcsCalendarData(ics)).toEqual([
      expect.objectContaining({
        allDay: false,
        hasRrule: false,
        status: 'confirmed',
        summary: 'Standup',
        transparent: false,
        uid: 'evt-1',
      }),
    ]);
  });

  it('parses DURATION when DTEND is absent', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:dur-1',
      'SUMMARY:Call',
      'DTSTART:20260717T100000Z',
      'DURATION:PT45M',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const [event] = parseIcsCalendarData(ics);
    expect(event?.endMs - event!.startMs).toBe(45 * 60 * 1000);
  });

  it('keeps multiple occurrences with the same UID', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:series-1',
      'SUMMARY:Daily',
      'DTSTART:20260713T100000Z',
      'DTEND:20260713T103000Z',
      'RECURRENCE-ID:20260713T100000Z',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:series-1',
      'SUMMARY:Daily',
      'DTSTART:20260714T100000Z',
      'DTEND:20260714T103000Z',
      'RECURRENCE-ID:20260714T100000Z',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    expect(parseIcsCalendarData(ics)).toHaveLength(2);
  });

  it('parses STATUS and TRANSP', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:c1',
      'SUMMARY:Cancelled',
      'STATUS:CANCELLED',
      'DTSTART:20260717T100000Z',
      'DTEND:20260717T110000Z',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    expect(parseIcsCalendarData(ics)[0]).toMatchObject({ status: 'cancelled' });
  });

  it('parses RRULE and EXDATE', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:series',
      'SUMMARY:Standup',
      'DTSTART:20260713T100000Z',
      'DTEND:20260713T103000Z',
      'RRULE:FREQ=DAILY;COUNT=5',
      'EXDATE:20260714T100000Z',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    expect(parseIcsCalendarData(ics)[0]).toMatchObject({
      hasRrule: true,
      rrule: 'FREQ=DAILY;COUNT=5',
    });
    expect(parseIcsCalendarData(ics)[0]?.exdateMs).toHaveLength(1);
  });
  it('parses TZID=Europe/Moscow as Moscow wall time (not server local)', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:msk-1',
      'SUMMARY:Standup',
      'DTSTART;TZID=Europe/Moscow:20260717T100000',
      'DTEND;TZID=Europe/Moscow:20260717T110000',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const [event] = parseIcsCalendarData(ics);
    const startInMoscow = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hourCycle: 'h23',
      minute: '2-digit',
      timeZone: 'Europe/Moscow',
    }).format(new Date(event!.startMs));
    const endInMoscow = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hourCycle: 'h23',
      minute: '2-digit',
      timeZone: 'Europe/Moscow',
    }).format(new Date(event!.endMs));

    expect(startInMoscow).toBe('10:00');
    expect(endInMoscow).toBe('11:00');
  });

  it('parses floating datetime as Europe/Moscow', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:float-1',
      'SUMMARY:Call',
      'DTSTART:20260717T150000',
      'DTEND:20260717T160000',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const [event] = parseIcsCalendarData(ics);
    const startInMoscow = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hourCycle: 'h23',
      minute: '2-digit',
      timeZone: 'Europe/Moscow',
    }).format(new Date(event!.startMs));
    expect(startInMoscow).toBe('15:00');
  });

  it('parses UTC Z as absolute instant', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:utc-1',
      'SUMMARY:Call',
      'DTSTART:20260717T070000Z',
      'DTEND:20260717T080000Z',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const [event] = parseIcsCalendarData(ics);
    const startInMoscow = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hourCycle: 'h23',
      minute: '2-digit',
      timeZone: 'Europe/Moscow',
    }).format(new Date(event!.startMs));
    expect(startInMoscow).toBe('10:00');
  });
  it('parses detail fields LOCATION DESCRIPTION ORGANIZER ATTENDEE URL', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:detail-1',
      'SUMMARY:Sync',
      'DESCRIPTION:Agenda\\nLine 2',
      'LOCATION:Room A',
      'URL:https://example.com/meet',
      'ORGANIZER;CN=Alice:mailto:alice@example.com',
      'ATTENDEE;CN=Bob;PARTSTAT=ACCEPTED:mailto:bob@example.com',
      'CATEGORIES:Work,Team',
      'CLASS:PRIVATE',
      'DTSTART;TZID=Europe/Moscow:20260717T100000',
      'DTEND;TZID=Europe/Moscow:20260717T110000',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    expect(parseIcsCalendarData(ics)[0]).toMatchObject({
      categories: ['Work', 'Team'],
      classification: 'PRIVATE',
      description: 'Agenda\nLine 2',
      location: 'Room A',
      organizer: { cn: 'Alice', email: 'alice@example.com' },
      attendees: [{ cn: 'Bob', email: 'bob@example.com', partStat: 'ACCEPTED' }],
      url: 'https://example.com/meet',
    });
  });
});

describe('expandRecurringCalendarEvents', () => {
  it('expands daily RRULE across the sprint window', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:daily-1',
      'SUMMARY:Standup',
      'DTSTART:20260713T100000Z',
      'DTEND:20260713T103000Z',
      'RRULE:FREQ=DAILY;COUNT=10',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const [master] = parseIcsCalendarData(ics);
    const rangeStart = Date.parse('2026-07-13T00:00:00Z');
    const rangeEnd = Date.parse('2026-07-17T23:59:59Z');
    const expanded = expandRecurringCalendarEvents([master!], rangeStart, rangeEnd);

    expect(expanded.length).toBeGreaterThanOrEqual(5);
    expect(expanded.every((e) => !e.hasRrule)).toBe(true);
    expect(new Set(expanded.map((e) => e.startMs)).size).toBe(expanded.length);
  });

  it('skips EXDATE occurrences', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:daily-2',
      'SUMMARY:Standup',
      'DTSTART:20260713T100000Z',
      'DTEND:20260713T103000Z',
      'RRULE:FREQ=DAILY;COUNT=3',
      'EXDATE:20260714T100000Z',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const [master] = parseIcsCalendarData(ics);
    const rangeStart = Date.parse('2026-07-13T00:00:00Z');
    const rangeEnd = Date.parse('2026-07-16T23:59:59Z');
    const expanded = expandRecurringCalendarEvents([master!], rangeStart, rangeEnd);
    const skipped = Date.parse('2026-07-14T10:00:00Z');

    expect(expanded.map((e) => e.startMs)).not.toContain(skipped);
    expect(expanded).toHaveLength(2);
  });
});

describe('extractIcsFromCalDavMultistatus', () => {
  it('decodes CDATA and numeric entities', () => {
    const xml = `<?xml version="1.0"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:response>
    <D:propstat>
      <D:prop>
        <C:calendar-data><![CDATA[BEGIN:VCALENDAR
BEGIN:VEVENT
UID:x
SUMMARY:Meet
DTSTART:20260717T100000Z
DTEND:20260717T110000Z
END:VEVENT
END:VCALENDAR]]></C:calendar-data>
      </D:prop>
    </D:propstat>
  </D:response>
</D:multistatus>`;

    const blocks = extractIcsFromCalDavMultistatus(xml);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('UID:x');
  });
});

describe('mapCalendarEventsToBusySegments', () => {
  it('maps event into fractional sprint cells', () => {
    const sprintStart = new Date(2026, 6, 13, 0, 0, 0, 0); // Mon 13 Jul 2026 local
    const segments = mapCalendarEventsToBusySegments(
      [
        busyFixture({
          // 10:00–11:30 Europe/Moscow
          endMs: Date.parse('2026-07-13T08:30:00Z'),
          startMs: Date.parse('2026-07-13T07:00:00Z'),
          summary: 'Meeting',
          uid: '1',
        }),
      ],
      sprintStart,
      30
    );

    expect(segments.length).toBe(1);
    expect(segments[0]!.startCell).toBeCloseTo(1 / 3, 5);
    expect(segments[0]!.endCell).toBeCloseTo(1 / 3 + 0.5, 5);
    expect(segments[0]!.events).toHaveLength(1);
    expect(segments[0]!.events[0]).toMatchObject({ summary: 'Meeting' });
  });

  it('maps 1h Moscow meeting to 1/9 of workday (not 1/24), even if runtime TZ is UTC', () => {
    const sprintStart = new Date(2026, 6, 13, 0, 0, 0, 0);
    const events = parseIcsCalendarData(
      [
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'UID:msk-1h',
        'SUMMARY:Standup',
        'DTSTART;TZID=Europe/Moscow:20260713T100000',
        'DTEND;TZID=Europe/Moscow:20260713T110000',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\n')
    );

    const segments = mapCalendarEventsToBusySegments(events, sprintStart, 30);

    expect(segments).toHaveLength(1);
    // 10:00–11:00 в сетке 9:00–18:00 → 1/9 дня = 1/3 одной части
    expect(segments[0]!.startCell).toBeCloseTo(1 / 3, 5);
    expect(segments[0]!.endCell - segments[0]!.startCell).toBeCloseTo(1 / 3, 5);
  });

  it('merges overlapping events into one segment', () => {
    const sprintStart = new Date(2026, 6, 13, 0, 0, 0, 0);
    const segments = mapCalendarEventsToBusySegments(
      [
        busyFixture({
          endMs: Date.parse('2026-07-13T08:00:00Z'),
          startMs: Date.parse('2026-07-13T07:00:00Z'),
          summary: 'A',
          uid: 'a',
        }),
        busyFixture({
          endMs: Date.parse('2026-07-13T09:00:00Z'),
          startMs: Date.parse('2026-07-13T07:30:00Z'),
          summary: 'B',
          uid: 'b',
        }),
      ],
      sprintStart,
      30
    );

    expect(segments).toHaveLength(1);
    expect(segments[0]!.events.map((e) => e.summary)).toEqual(['A', 'B']);
  });

  it('merges adjacent (touching) events into one segment', () => {
    const sprintStart = new Date(2026, 6, 13, 0, 0, 0, 0);
    const segments = mapCalendarEventsToBusySegments(
      [
        busyFixture({
          endMs: Date.parse('2026-07-13T08:00:00Z'),
          startMs: Date.parse('2026-07-13T07:00:00Z'),
          summary: 'A',
          uid: 'a',
        }),
        busyFixture({
          endMs: Date.parse('2026-07-13T09:00:00Z'),
          startMs: Date.parse('2026-07-13T08:00:00Z'),
          summary: 'B',
          uid: 'b',
        }),
      ],
      sprintStart,
      30
    );

    expect(segments).toHaveLength(1);
    expect(segments[0]!.events.map((e) => e.summary)).toEqual(['A', 'B']);
  });

  it('skips cancelled and transparent events', () => {
    const sprintStart = new Date(2026, 6, 13, 0, 0, 0, 0);
    const segments = mapCalendarEventsToBusySegments(
      [
        busyFixture({
          endMs: Date.parse('2026-07-13T08:00:00Z'),
          startMs: Date.parse('2026-07-13T07:00:00Z'),
          status: 'cancelled',
          summary: 'X',
          uid: 'c',
        }),
        busyFixture({
          endMs: Date.parse('2026-07-13T09:00:00Z'),
          startMs: Date.parse('2026-07-13T08:00:00Z'),
          summary: 'Free',
          transparent: true,
          uid: 't',
        }),
      ],
      sprintStart,
      30
    );
    expect(segments).toHaveLength(0);
  });
});
