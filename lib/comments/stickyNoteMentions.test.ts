import { describe, expect, it } from 'vitest';

import {
  diffNewStickyNoteMentionAssigneeIds,
  filterMentionCandidates,
  formatStickyNoteMentionToken,
  formatStickyNoteTextForPreview,
  getMentionQueryAtCaret,
  insertStickyNoteMentionToken,
  parseStickyNoteMentionAssigneeIds,
  splitStickyNoteTextByMentions,
} from './stickyNoteMentions';

const developers = [
  { id: 'dev-1', name: 'Anna Petrova', role: 'developer' as const },
  { id: 'dev-2', name: 'Ivan Sidorov', role: 'developer' as const },
];

describe('formatStickyNoteMentionToken', () => {
  it('formats mention token', () => {
    expect(formatStickyNoteMentionToken({ id: 'dev-1', name: 'Anna Petrova' })).toBe(
      '@[Anna Petrova](dev-1)'
    );
  });
});

describe('getMentionQueryAtCaret', () => {
  it('detects active mention query', () => {
    expect(getMentionQueryAtCaret('Hello @An', 9)).toEqual({ start: 6, query: 'An' });
  });

  it('returns null when @ is inside a word', () => {
    expect(getMentionQueryAtCaret('email@test.com', 5)).toBeNull();
  });
});

describe('filterMentionCandidates', () => {
  it('filters developers by query', () => {
    expect(filterMentionCandidates(developers, 'ann').map((item) => item.id)).toEqual(['dev-1']);
  });
});

describe('insertStickyNoteMentionToken', () => {
  it('replaces @query with token and trailing space', () => {
    expect(
      insertStickyNoteMentionToken({
        text: 'Hi @An',
        caret: 6,
        mentionStart: 3,
        developer: developers[0]!,
      })
    ).toEqual({
      nextText: 'Hi @[Anna Petrova](dev-1) ',
      nextCaret: 26,
    });
  });
});

describe('splitStickyNoteTextByMentions', () => {
  it('splits text and mention segments', () => {
    expect(splitStickyNoteTextByMentions('Hi @[Anna Petrova](dev-1)!')).toEqual([
      { type: 'text', value: 'Hi ' },
      { type: 'mention', name: 'Anna Petrova', id: 'dev-1' },
      { type: 'text', value: '!' },
    ]);
  });
});

describe('parseStickyNoteMentionAssigneeIds', () => {
  it('returns unique assignee ids from mention tokens', () => {
    expect(
      parseStickyNoteMentionAssigneeIds('Hi @[Anna](dev-1) and @[Ivan](dev-2) and @[Anna](dev-1)')
    ).toEqual(['dev-1', 'dev-2']);
  });
});

describe('diffNewStickyNoteMentionAssigneeIds', () => {
  it('returns only newly added mentions on edit', () => {
    expect(
      diffNewStickyNoteMentionAssigneeIds(
        'Hi @[Anna](dev-1)',
        'Hi @[Anna](dev-1) cc @[Ivan](dev-2)'
      )
    ).toEqual(['dev-2']);
  });
});

describe('formatStickyNoteTextForPreview', () => {
  it('replaces mention tokens with @name for preview', () => {
    expect(formatStickyNoteTextForPreview('Привет @[Anna](dev-1)')).toBe('Привет @Anna');
  });
});
