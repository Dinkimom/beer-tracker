import { describe, expect, it } from 'vitest';

import { isStickyNoteIssueKey, splitStickyNoteTextByIssueKeys } from './stickyNoteIssueKeys';

describe('isStickyNoteIssueKey', () => {
  it('accepts tracker-style keys', () => {
    expect(isStickyNoteIssueKey('FRONTEND-456')).toBe(true);
    expect(isStickyNoteIssueKey('BT-W2-4')).toBe(true);
    expect(isStickyNoteIssueKey('PROJ-12')).toBe(true);
  });

  it('rejects non-keys', () => {
    expect(isStickyNoteIssueKey('BT')).toBe(false);
    expect(isStickyNoteIssueKey('123-456')).toBe(false);
    expect(isStickyNoteIssueKey('see BT-1')).toBe(false);
  });
});

describe('splitStickyNoteTextByIssueKeys', () => {
  it('keeps plain text as a single segment', () => {
    expect(splitStickyNoteTextByIssueKeys('just a note')).toEqual([
      { type: 'text', value: 'just a note' },
    ]);
  });

  it('extracts bare issue keys and surrounding text', () => {
    expect(splitStickyNoteTextByIssueKeys('see BT-1 and FRONTEND-456 later')).toEqual([
      { type: 'text', value: 'see ' },
      { key: 'BT-1', type: 'issueKey' },
      { type: 'text', value: ' and ' },
      { key: 'FRONTEND-456', type: 'issueKey' },
      { type: 'text', value: ' later' },
    ]);
  });

  it('keeps punctuation after a key', () => {
    expect(splitStickyNoteTextByIssueKeys('Fix BT-W2-4.')).toEqual([
      { type: 'text', value: 'Fix ' },
      { key: 'BT-W2-4', type: 'issueKey' },
      { type: 'text', value: '.' },
    ]);
  });

  it('does not match a key with a trailing letter or digit glued on', () => {
    expect(splitStickyNoteTextByIssueKeys('BT-1y and BT-12x keep BT-1')).toEqual([
      { type: 'text', value: 'BT-1y and BT-12x keep ' },
      { key: 'BT-1', type: 'issueKey' },
    ]);
  });
});
