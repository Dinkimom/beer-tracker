import type { ParsedCalendarEvent } from './calendarEventTypes';

import { describe, expect, it } from 'vitest';

import {
  collectSharedBusyEmails,
  distributeCalendarEventsToDevelopers,
  normalizeCalendarEmail,
} from './distributeCalendarEventsToDevelopers';

function eventFixture(
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

describe('normalizeCalendarEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeCalendarEmail('  A@B.C ')).toBe('a@b.c');
    expect(normalizeCalendarEmail('')).toBeNull();
  });
});

describe('collectSharedBusyEmails', () => {
  it('includes organizer and non-declined attendees', () => {
    const emails = collectSharedBusyEmails(
      eventFixture({
        attendees: [
          { email: 'dev@co.tech', partStat: 'ACCEPTED' },
          { email: 'skip@co.tech', partStat: 'DECLINED' },
        ],
        endMs: 2,
        organizer: { email: 'lead@co.tech' },
        startMs: 1,
        summary: 'Sync',
        uid: '1',
      })
    );
    expect(emails.sort()).toEqual(['dev@co.tech', 'lead@co.tech']);
  });
});

describe('distributeCalendarEventsToDevelopers', () => {
  it('puts owner events on owner lane and shared attendees on matching developers', () => {
    const meeting = eventFixture({
      attendees: [{ email: 'qa@co.tech', partStat: 'NEEDS-ACTION' }],
      endMs: 200,
      organizer: { email: 'lead@co.tech' },
      startMs: 100,
      summary: 'Planning',
      uid: 'meet-1',
    });

    const distributed = distributeCalendarEventsToDevelopers({
      developers: [
        { email: 'lead@co.tech', id: 'lead' },
        { email: 'qa@co.tech', id: 'qa' },
        { email: 'other@co.tech', id: 'other' },
      ],
      eventsByOwnerId: new Map([['lead', [meeting]]]),
    });

    expect(distributed.get('lead')?.map((e) => e.uid)).toEqual(['meet-1']);
    expect(distributed.get('qa')?.map((e) => e.uid)).toEqual(['meet-1']);
    expect(distributed.has('other')).toBe(false);
  });

  it('dedupes the same event when it appears from two calendars', () => {
    const meeting = eventFixture({
      attendees: [{ email: 'qa@co.tech' }],
      endMs: 200,
      startMs: 100,
      summary: 'Sync',
      uid: 'same',
    });

    const distributed = distributeCalendarEventsToDevelopers({
      developers: [
        { email: 'lead@co.tech', id: 'lead' },
        { email: 'qa@co.tech', id: 'qa' },
      ],
      eventsByOwnerId: new Map([
        ['lead', [meeting]],
        ['qa', [{ ...meeting }]],
      ]),
    });

    expect(distributed.get('qa')).toHaveLength(1);
    expect(distributed.get('lead')).toHaveLength(1);
  });
});
