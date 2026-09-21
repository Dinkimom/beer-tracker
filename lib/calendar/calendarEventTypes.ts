/** Участник / организатор из ORGANIZER или ATTENDEE. */
export interface CalendarEventPerson {
  cn?: string;
  email?: string;
  /** PARTSTAT: ACCEPTED | DECLINED | TENTATIVE | NEEDS-ACTION | … */
  partStat?: string;
  /** ROLE: REQ-PARTICIPANT | OPT-PARTICIPANT | … */
  role?: string;
}

/** Событие календаря после парсинга ICS. */
export interface ParsedCalendarEvent {
  allDay: boolean;
  attendees: CalendarEventPerson[];
  categories: string[];
  /** CLASS: PUBLIC | PRIVATE | CONFIDENTIAL */
  classification?: string;
  comment?: string;
  createdMs?: number;
  description?: string;
  dtStampMs?: number;
  endMs: number;
  /** Даты исключений (EXDATE), ms */
  exdateMs: number[];
  /** true = мастер серии с RRULE (не развёрнутый экземпляр) */
  hasRrule: boolean;
  lastModifiedMs?: number;
  location?: string;
  organizer?: CalendarEventPerson;
  priority?: number;
  /** ISO RECURRENCE-ID, если это экземпляр серии */
  recurrenceId?: string;
  /** Сырое значение RRULE без префикса (FREQ=...) */
  rrule?: string;
  sequence?: number;
  startMs: number;
  status: 'cancelled' | 'confirmed' | 'tentative';
  summary: string;
  /** true = свободно (не busy) */
  transparent: boolean;
  uid: string;
  url?: string;
}

/**
 * Событие внутри busy-блока / модалки деталей.
 * Поля опциональны: Mail.ru и другие CalDAV отдают разный набор.
 */
export interface CalendarBusyEventItem {
  allDay: boolean;
  attendees: CalendarEventPerson[];
  categories: string[];
  classification?: string;
  comment?: string;
  createdMs?: number;
  description?: string;
  dtStampMs?: number;
  endMs: number;
  lastModifiedMs?: number;
  location?: string;
  organizer?: CalendarEventPerson;
  priority?: number;
  rrule?: string;
  sequence?: number;
  startMs: number;
  status: 'cancelled' | 'confirmed' | 'tentative';
  summary: string;
  transparent: boolean;
  uid: string;
  url?: string;
}

/** Занятость на таймлайне спринта (дробные ячейки; пересечения уже схлопнуты). */
export interface CalendarBusySegment {
  endCell: number;
  events: CalendarBusyEventItem[];
  startCell: number;
  uid: string;
}

export interface CalDavCredentialsInput {
  appPassword: string;
  caldavUrl: string;
  email: string;
}

/** Стабильный ключ экземпляра (серии + occurrence). */
export function calendarEventInstanceKey(event: ParsedCalendarEvent): string {
  return `${event.uid}:${event.recurrenceId ?? event.startMs}`;
}

export function toCalendarBusyEventItem(event: ParsedCalendarEvent): CalendarBusyEventItem {
  return {
    allDay: event.allDay,
    attendees: event.attendees.map((a) => ({ ...a })),
    categories: [...event.categories],
    classification: event.classification,
    comment: event.comment,
    createdMs: event.createdMs,
    description: event.description,
    dtStampMs: event.dtStampMs,
    endMs: event.endMs,
    lastModifiedMs: event.lastModifiedMs,
    location: event.location,
    organizer: event.organizer ? { ...event.organizer } : undefined,
    priority: event.priority,
    rrule: event.rrule,
    sequence: event.sequence,
    startMs: event.startMs,
    status: event.status,
    summary: event.summary,
    transparent: event.transparent,
    uid: calendarEventInstanceKey(event),
    url: event.url,
  };
}
