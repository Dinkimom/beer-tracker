import { describe, expect, it } from 'vitest';

import {
  DEFAULT_STICKY_NOTE_COLOR,
  isStickyNoteColor,
  parseOptionalStickyNoteColor,
  parseStickyNoteColor,
  STICKY_NOTE_COLOR_LABEL_KEYS,
  STICKY_NOTE_COLORS,
} from './stickyNoteColor';

describe('stickyNoteColor', () => {
  it('lists the five supported note colors', () => {
    expect(STICKY_NOTE_COLORS).toEqual(['yellow', 'pink', 'green', 'blue', 'gray']);
    expect(STICKY_NOTE_COLORS.every((color) => STICKY_NOTE_COLOR_LABEL_KEYS[color])).toBe(true);
  });

  it('parses known colors and falls back to yellow', () => {
    expect(parseStickyNoteColor('pink')).toBe('pink');
    expect(parseStickyNoteColor('blue')).toBe('blue');
    expect(parseStickyNoteColor('purple')).toBe(DEFAULT_STICKY_NOTE_COLOR);
    expect(parseStickyNoteColor(undefined)).toBe('yellow');
    expect(isStickyNoteColor('green')).toBe(true);
    expect(isStickyNoteColor('orange')).toBe(false);
  });

  it('treats missing or invalid PUT values as “do not update”', () => {
    expect(parseOptionalStickyNoteColor(undefined)).toBeNull();
    expect(parseOptionalStickyNoteColor(null)).toBeNull();
    expect(parseOptionalStickyNoteColor('not-a-color')).toBeNull();
    expect(parseOptionalStickyNoteColor('gray')).toBe('gray');
  });
});
