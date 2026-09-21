import { describe, expect, it } from 'vitest';

import {
  hasDailyNote,
  parseSprintDailyNotes,
  setDailyNote,
  sprintDailyNotesStorageKey,
} from './sprintDailyNotesStorage';

describe('sprintDailyNotesStorage', () => {
  it('builds storage key from sprint id', () => {
    expect(sprintDailyNotesStorageKey(42)).toBe('beer-tracker-sprint-daily-notes-42');
  });

  it('parseSprintDailyNotes keeps valid day entries only', () => {
    expect(parseSprintDailyNotes(null)).toEqual({});
    expect(parseSprintDailyNotes({ 0: 'note', 1: 2, x: 'bad', '-1': 'bad' })).toEqual({
      0: 'note',
    });
  });

  it('setDailyNote upserts and removes empty notes', () => {
    const withNote = setDailyNote({}, 2, 'standup');
    expect(withNote).toEqual({ 2: 'standup' });
    expect(setDailyNote(withNote, 2, '   ')).toEqual({});
  });

  it('hasDailyNote ignores whitespace-only values', () => {
    expect(hasDailyNote({ 0: '   ' }, 0)).toBe(false);
    expect(hasDailyNote({ 1: 'notes' }, 1)).toBe(true);
  });
});
