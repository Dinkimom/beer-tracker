import { describe, expect, it } from 'vitest';

import {
  isStickyNoteReactionChipMotionName,
  resolveStickyNoteReactionChipMotions,
  snapshotStickyNoteReactionCounts,
  STICKY_NOTE_REACTION_CHIP_BUMP_ANIMATION,
  STICKY_NOTE_REACTION_CHIP_ENTER_ANIMATION,
  stickyNoteReactionChipMotionClass,
  stickyNoteReactionListSignature,
} from './stickyNoteReactionChipMotion';

describe('stickyNoteReactionChipMotion', () => {
  it('plays enter for the first chip on an empty note', () => {
    expect(
      Object.fromEntries(resolveStickyNoteReactionChipMotions(new Map(), [{ count: 1, emoji: '👍' }]))
    ).toEqual({ '👍': 'enter' });
  });

  it('treats a new emoji as enter and a higher count as bump', () => {
    const previous = snapshotStickyNoteReactionCounts([
      { count: 1, emoji: '👍' },
      { count: 2, emoji: '🔥' },
    ]);

    expect(
      Object.fromEntries(
        resolveStickyNoteReactionChipMotions(previous, [
          { count: 1, emoji: '👍' },
          { count: 3, emoji: '🔥' },
          { count: 1, emoji: '🚀' },
        ])
      )
    ).toEqual({ '🔥': 'bump', '🚀': 'enter' });
  });

  it('does not animate a count drop or an unchanged chip', () => {
    const previous = snapshotStickyNoteReactionCounts([{ count: 3, emoji: '👍' }]);

    expect(resolveStickyNoteReactionChipMotions(previous, [{ count: 3, emoji: '👍' }]).size).toBe(0);
    expect(resolveStickyNoteReactionChipMotions(previous, [{ count: 2, emoji: '👍' }]).size).toBe(0);
  });

  it('maps motion to a css class and recognizes animation names', () => {
    expect(stickyNoteReactionChipMotionClass('enter')).toBe('sticky-note-reaction-chip-enter');
    expect(stickyNoteReactionChipMotionClass('bump')).toBe('sticky-note-reaction-chip-bump');
    expect(stickyNoteReactionChipMotionClass(null)).toBe('');
    expect(isStickyNoteReactionChipMotionName(STICKY_NOTE_REACTION_CHIP_ENTER_ANIMATION)).toBe(true);
    expect(isStickyNoteReactionChipMotionName(STICKY_NOTE_REACTION_CHIP_BUMP_ANIMATION)).toBe(true);
    expect(isStickyNoteReactionChipMotionName('sprint-card-presence-enter')).toBe(false);
  });

  it('builds a stable signature from emoji and count', () => {
    expect(
      stickyNoteReactionListSignature([
        { count: 1, emoji: '👍' },
        { count: 2, emoji: '🔥' },
      ])
    ).toBe('👍:1\0🔥:2');
  });
});
