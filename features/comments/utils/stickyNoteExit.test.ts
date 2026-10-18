import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  STICKY_NOTE_EXIT_MS,
  getStickyNoteExitSnapshot,
  isStickyNoteExiting,
  playStickyNoteExit,
  shouldAnimateStickyNoteDelete,
} from './stickyNoteExit';

describe('shouldAnimateStickyNoteDelete', () => {
  it('animates a text note and leaves photos, diagrams, and conversions alone', () => {
    expect(shouldAnimateStickyNoteDelete({ kind: 'text' })).toBe(true);
    expect(shouldAnimateStickyNoteDelete({})).toBe(true);
    expect(shouldAnimateStickyNoteDelete({ kind: 'image' })).toBe(false);
    expect(shouldAnimateStickyNoteDelete({ kind: 'diagram' })).toBe(false);
    expect(shouldAnimateStickyNoteDelete({ kind: 'widget' })).toBe(false);
    expect(shouldAnimateStickyNoteDelete(undefined)).toBe(false);
    expect(shouldAnimateStickyNoteDelete({ kind: 'text' }, 'TASK-1')).toBe(false);
  });
});

describe('playStickyNoteExit', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('removes immediately when motion is reduced', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const onDone = vi.fn();
    playStickyNoteExit('comment:note', onDone);
    expect(onDone).toHaveBeenCalledOnce();
    expect(isStickyNoteExiting('comment:note')).toBe(false);
  });

  it('keeps the note until the exit animation finishes', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.useFakeTimers();
    const onDone = vi.fn();
    playStickyNoteExit('comment:note', onDone);
    expect(isStickyNoteExiting('comment:note')).toBe(true);
    expect(getStickyNoteExitSnapshot().has('comment:note')).toBe(true);
    expect(onDone).not.toHaveBeenCalled();
    playStickyNoteExit('comment:note', onDone);
    vi.advanceTimersByTime(STICKY_NOTE_EXIT_MS);
    expect(onDone).toHaveBeenCalledOnce();
    expect(isStickyNoteExiting('comment:note')).toBe(false);
  });
});
