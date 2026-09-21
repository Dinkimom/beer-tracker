import {
  calendarEventInstanceKey,
  type ParsedCalendarEvent,
} from './calendarEventTypes';

export function normalizeCalendarEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase();
  return trimmed || null;
}

function isDeclinedAttendee(partStat: string | undefined): boolean {
  return partStat?.toUpperCase() === 'DECLINED';
}

/** Email'ы участников события, которым нужно показать занятость (без DECLINED). */
export function collectSharedBusyEmails(event: ParsedCalendarEvent): string[] {
  const emails = new Set<string>();

  const organizerEmail = normalizeCalendarEmail(event.organizer?.email);
  if (organizerEmail) emails.add(organizerEmail);

  for (const attendee of event.attendees) {
    if (isDeclinedAttendee(attendee.partStat)) continue;
    const email = normalizeCalendarEmail(attendee.email);
    if (email) emails.add(email);
  }

  return [...emails];
}

export interface CalendarBusyDeveloperRef {
  email?: string | null;
  id: string;
}

function buildEmailToDeveloperIds(
  developers: CalendarBusyDeveloperRef[]
): Map<string, string[]> {
  const emailToDeveloperIds = new Map<string, string[]>();
  for (const developer of developers) {
    const email = normalizeCalendarEmail(developer.email);
    if (!email) continue;
    const list = emailToDeveloperIds.get(email) ?? [];
    list.push(developer.id);
    emailToDeveloperIds.set(email, list);
  }
  return emailToDeveloperIds;
}

function resolveEventTargetDeveloperIds(
  ownerId: string,
  event: ParsedCalendarEvent,
  emailToDeveloperIds: Map<string, string[]>
): Set<string> {
  const targets = new Set<string>([ownerId]);
  for (const email of collectSharedBusyEmails(event)) {
    for (const developerId of emailToDeveloperIds.get(email) ?? []) {
      targets.add(developerId);
    }
  }
  return targets;
}

function putEventOnTargets(
  byDeveloper: Map<string, Map<string, ParsedCalendarEvent>>,
  targets: Set<string>,
  key: string,
  event: ParsedCalendarEvent
): void {
  for (const developerId of targets) {
    let bucket = byDeveloper.get(developerId);
    if (!bucket) {
      bucket = new Map();
      byDeveloper.set(developerId, bucket);
    }
    bucket.set(key, event);
  }
}

function toSortedEventLists(
  byDeveloper: Map<string, Map<string, ParsedCalendarEvent>>
): Map<string, ParsedCalendarEvent[]> {
  const result = new Map<string, ParsedCalendarEvent[]>();
  for (const [developerId, events] of byDeveloper) {
    result.set(
      developerId,
      [...events.values()].sort((a, b) => a.startMs - b.startMs)
    );
  }
  return result;
}

/**
 * Раскладывает события из календарей с credentials по свимлейнам команды:
 * владелец календаря + участники/организатор с совпавшим email.
 */
export function distributeCalendarEventsToDevelopers(input: {
  /** developerId → события из его CalDAV */
  eventsByOwnerId: Map<string, ParsedCalendarEvent[]>;
  developers: CalendarBusyDeveloperRef[];
}): Map<string, ParsedCalendarEvent[]> {
  const emailToDeveloperIds = buildEmailToDeveloperIds(input.developers);
  const byDeveloper = new Map<string, Map<string, ParsedCalendarEvent>>();

  for (const [ownerId, events] of input.eventsByOwnerId) {
    for (const event of events) {
      putEventOnTargets(
        byDeveloper,
        resolveEventTargetDeveloperIds(ownerId, event, emailToDeveloperIds),
        calendarEventInstanceKey(event),
        event
      );
    }
  }

  return toSortedEventLists(byDeveloper);
}
