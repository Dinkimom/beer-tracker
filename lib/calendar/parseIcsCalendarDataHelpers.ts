import type { ParsedCalendarEvent } from './calendarEventTypes';

import {
  addCalendarDaysInTimeZoneMs,
  CALENDAR_DEFAULT_TIME_ZONE,
  endOfWorkdayInTimeZoneMs,
  parseIcsDateValue,
} from './icsDateTimeParse';
import { parseIcsPerson, unescapeIcsText } from './icsPersonParse';

export { parseIcsDateValue } from './icsDateTimeParse';

export function unfoldIcsLines(raw: string): string[] {
  const physical = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines: string[] = [];
  for (const line of physical) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      const prev = lines.pop();
      lines.push((prev ?? '') + line.slice(1));
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function endOfWorkdayMs(dateMs: number): number {
  return endOfWorkdayInTimeZoneMs(dateMs, CALENDAR_DEFAULT_TIME_ZONE);
}

function addDaysLocal(dateMs: number, days: number): number {
  return addCalendarDaysInTimeZoneMs(dateMs, days, CALENDAR_DEFAULT_TIME_ZONE);
}

function resolveEventEndMs(endMs: number, startMs: number, allDay: boolean): number {
  if (Number.isFinite(endMs)) {
    return endMs;
  }
  if (allDay) {
    return endOfWorkdayMs(startMs);
  }
  return startMs + 60 * 60 * 1000;
}

function parseEventStatus(raw: string): ParsedCalendarEvent['status'] {
  const value = raw.trim().toUpperCase();
  if (value === 'CANCELLED') return 'cancelled';
  if (value === 'TENTATIVE') return 'tentative';
  return 'confirmed';
}

/** Парсит ICS DURATION (PTnHnMnS / PnD) в миллисекунды. */
function parseIcsDurationToMs(raw: string): number {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i.exec(raw.trim());
  if (!match) return NaN;
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  return (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
}

function parseExdateValues(value: string, params: string): number[] {
  return value
    .split(',')
    .map((part) => parseIcsDateValue(part.trim(), params).ms)
    .filter((ms) => Number.isFinite(ms));
}

function parseOptionalDateMs(value: string, params: string): number | undefined {
  const ms = parseIcsDateValue(value.trim(), params).ms;
  return Number.isFinite(ms) ? ms : undefined;
}

interface MutableVEvent {
  allDay: boolean;
  attendees: ParsedCalendarEvent['attendees'];
  categories: string[];
  classification?: string;
  comment?: string;
  createdMs?: number;
  description?: string;
  dtStampMs?: number;
  durationMs: number;
  endMs: number;
  exdateMs: number[];
  lastModifiedMs?: number;
  location?: string;
  organizer?: ParsedCalendarEvent['organizer'];
  priority?: number;
  recurrenceId?: string;
  rrule?: string;
  sequence?: number;
  startMs: number;
  status: ParsedCalendarEvent['status'];
  summary: string;
  transparent: boolean;
  uid: string;
  url?: string;
}

export function createEmptyVEvent(): MutableVEvent {
  return {
    allDay: false,
    attendees: [],
    categories: [],
    durationMs: NaN,
    endMs: NaN,
    exdateMs: [],
    startMs: NaN,
    status: 'confirmed',
    summary: '',
    transparent: false,
    uid: '',
  };
}

function applyDtStart(event: MutableVEvent, value: string, params: string): void {
  const parsed = parseIcsDateValue(value.trim(), params);
  event.allDay = parsed.allDay;
  event.startMs = parsed.ms;
}

function applyDtEnd(event: MutableVEvent, value: string, params: string): void {
  const parsed = parseIcsDateValue(value.trim(), params);
  event.endMs = parsed.allDay
    ? endOfWorkdayMs(addDaysLocal(parsed.ms, -1))
    : parsed.ms;
}

type VEventPropertyApplier = (
  event: MutableVEvent,
  value: string,
  params: string
) => void;

const VEVENT_PROPERTY_APPLIERS: Record<string, VEventPropertyApplier> = {
  ATTENDEE: (event, value, params) => {
    event.attendees.push(parseIcsPerson(value, params));
  },
  CATEGORIES: (event, value) => {
    const parts = value
      .split(',')
      .map((part) => unescapeIcsText(part.trim()))
      .filter(Boolean);
    event.categories.push(...parts);
  },
  CLASS: (event, value) => {
    event.classification = value.trim().toUpperCase() || undefined;
  },
  COMMENT: (event, value) => {
    event.comment = unescapeIcsText(value.trim()) || undefined;
  },
  CREATED: (event, value, params) => {
    event.createdMs = parseOptionalDateMs(value, params);
  },
  DESCRIPTION: (event, value) => {
    event.description = unescapeIcsText(value) || undefined;
  },
  DTEND: applyDtEnd,
  DTSTAMP: (event, value, params) => {
    event.dtStampMs = parseOptionalDateMs(value, params);
  },
  DTSTART: applyDtStart,
  DURATION: (event, value) => {
    event.durationMs = parseIcsDurationToMs(value.trim());
  },
  EXDATE: (event, value, params) => {
    event.exdateMs.push(...parseExdateValues(value, params));
  },
  'LAST-MODIFIED': (event, value, params) => {
    event.lastModifiedMs = parseOptionalDateMs(value, params);
  },
  LOCATION: (event, value) => {
    event.location = unescapeIcsText(value.trim()) || undefined;
  },
  ORGANIZER: (event, value, params) => {
    event.organizer = parseIcsPerson(value, params);
  },
  PRIORITY: (event, value) => {
    const n = Number(value.trim());
    event.priority = Number.isFinite(n) ? n : undefined;
  },
  'RECURRENCE-ID': (event, value) => {
    event.recurrenceId = value.trim();
  },
  RRULE: (event, value) => {
    const trimmed = value.trim();
    if (trimmed) event.rrule = trimmed;
  },
  SEQUENCE: (event, value) => {
    const n = Number(value.trim());
    event.sequence = Number.isFinite(n) ? n : undefined;
  },
  STATUS: (event, value) => {
    event.status = parseEventStatus(value);
  },
  SUMMARY: (event, value) => {
    event.summary = unescapeIcsText(value.trim());
  },
  TRANSP: (event, value) => {
    event.transparent = value.trim().toUpperCase() === 'TRANSPARENT';
  },
  UID: (event, value) => {
    event.uid = value.trim();
  },
  URL: (event, value) => {
    event.url = value.trim() || undefined;
  },
};

export function applyVEventProperty(
  event: MutableVEvent,
  name: string,
  value: string,
  params: string
): void {
  VEVENT_PROPERTY_APPLIERS[name]?.(event, value, params);
}

function resolveEndFromEvent(event: MutableVEvent): number {
  if (Number.isFinite(event.endMs)) {
    return event.endMs;
  }
  if (Number.isFinite(event.durationMs)) {
    return event.startMs + event.durationMs;
  }
  return resolveEventEndMs(event.endMs, event.startMs, event.allDay);
}

export function flushVEvent(event: MutableVEvent): ParsedCalendarEvent | null {
  if (!Number.isFinite(event.startMs)) {
    return null;
  }
  const uid =
    event.uid.trim() ||
    `anon-${event.startMs}-${event.summary.trim() || 'busy'}`;
  const rrule = event.rrule?.trim() || undefined;
  return {
    allDay: event.allDay,
    attendees: event.attendees,
    categories: event.categories,
    classification: event.classification,
    comment: event.comment,
    createdMs: event.createdMs,
    description: event.description,
    dtStampMs: event.dtStampMs,
    endMs: resolveEndFromEvent(event),
    exdateMs: [...event.exdateMs],
    hasRrule: Boolean(rrule),
    lastModifiedMs: event.lastModifiedMs,
    location: event.location,
    organizer: event.organizer,
    priority: event.priority,
    recurrenceId: event.recurrenceId,
    rrule,
    sequence: event.sequence,
    startMs: event.startMs,
    status: event.status,
    summary: event.summary.trim() || 'Занят',
    transparent: event.transparent,
    uid,
    url: event.url,
  };
}
