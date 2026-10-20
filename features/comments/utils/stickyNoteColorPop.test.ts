import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  STICKY_NOTE_COLOR_POP_MS,
  getStickyNoteColorPopSnapshot,
  isStickyNoteColorPopping,
  playStickyNoteColorPop,
  shouldPlayStickyNoteColorPop,
  stickyNoteColorPopClassName,
  stickyNoteColorPopDurationMs,
} from './stickyNoteColorPop';

describe('stickyNoteColorPop', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('plays only after mount when the color actually changes', () => {
    expect(shouldPlayStickyNoteColorPop(undefined, 'yellow', false)).toBe(false);
    expect(shouldPlayStickyNoteColorPop('yellow', 'yellow', true)).toBe(false);
    expect(shouldPlayStickyNoteColorPop('yellow', 'green', true)).toBe(true);
  });

  it('emits the pop class only while an active sticky note is popping', () => {
    expect(stickyNoteColorPopClassName(true, true)).toBe(' sticky-note-color-pop');
    expect(stickyNoteColorPopClassName(true, false)).toBe('');
    expect(stickyNoteColorPopClassName(false, true)).toBe('');
  });

  it('skips motion when the user prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(stickyNoteColorPopDurationMs()).toBe(0);
    playStickyNoteColorPop('comment:1');
    expect(isStickyNoteColorPopping('comment:1')).toBe(false);
  });

  it('keeps the pop class until the animation finishes', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.useFakeTimers();
    playStickyNoteColorPop('comment:1');
    expect(isStickyNoteColorPopping('comment:1')).toBe(true);
    expect(getStickyNoteColorPopSnapshot().has('comment:1')).toBe(true);
    vi.advanceTimersByTime(STICKY_NOTE_COLOR_POP_MS);
    expect(isStickyNoteColorPopping('comment:1')).toBe(false);
  });
});
