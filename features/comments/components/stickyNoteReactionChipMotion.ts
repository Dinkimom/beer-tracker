'use client';

import type { AnimationEvent } from 'react';

import { useCallback, useState } from 'react';

type StickyNoteReactionChipMotion = 'bump' | 'enter';

const STICKY_NOTE_REACTION_CHIP_ENTER_CLASS = 'sticky-note-reaction-chip-enter';
const STICKY_NOTE_REACTION_CHIP_BUMP_CLASS = 'sticky-note-reaction-chip-bump';
export const STICKY_NOTE_REACTION_CHIP_ENTER_ANIMATION = 'sticky-note-reaction-enter';
export const STICKY_NOTE_REACTION_CHIP_BUMP_ANIMATION = 'sticky-note-reaction-bump';

export function stickyNoteReactionChipMotionClass(
  motion: StickyNoteReactionChipMotion | null
): string {
  if (motion === 'enter') {
    return STICKY_NOTE_REACTION_CHIP_ENTER_CLASS;
  }
  if (motion === 'bump') {
    return STICKY_NOTE_REACTION_CHIP_BUMP_CLASS;
  }
  return '';
}

export function isStickyNoteReactionChipMotionName(name: string): boolean {
  return (
    name === STICKY_NOTE_REACTION_CHIP_ENTER_ANIMATION ||
    name === STICKY_NOTE_REACTION_CHIP_BUMP_ANIMATION
  );
}

export function snapshotStickyNoteReactionCounts(
  reactions: ReadonlyArray<{ count: number; emoji: string }>
): Map<string, number> {
  return new Map(reactions.map((reaction) => [reaction.emoji, reaction.count]));
}

export function stickyNoteReactionListSignature(
  reactions: ReadonlyArray<{ count: number; emoji: string }>
): string {
  return reactions.map((reaction) => `${reaction.emoji}:${reaction.count}`).join('\0');
}

/** Первый снимок ряда — без анимации (открытие доски / маунт заметки). Дальше: новый эмодзи = enter, рост count = bump. */
export function resolveStickyNoteReactionChipMotions(
  previous: ReadonlyMap<string, number>,
  next: ReadonlyArray<{ count: number; emoji: string }>
): Map<string, StickyNoteReactionChipMotion> {
  const motions = new Map<string, StickyNoteReactionChipMotion>();
  for (const reaction of next) {
    const prevCount = previous.get(reaction.emoji);
    if (prevCount == null) {
      motions.set(reaction.emoji, 'enter');
      continue;
    }
    if (reaction.count > prevCount) {
      motions.set(reaction.emoji, 'bump');
    }
  }
  return motions;
}

export function useStickyNoteReactionChipMotions(
  reactions: ReadonlyArray<{ count: number; emoji: string }>
): {
  motionOf: (emoji: string) => StickyNoteReactionChipMotion | null;
  onChipAnimationEnd: (event: AnimationEvent<HTMLElement>, emoji: string) => void;
} {
  const signature = stickyNoteReactionListSignature(reactions);
  const [state, setState] = useState(() => ({
    counts: snapshotStickyNoteReactionCounts(reactions),
    motions: new Map<string, StickyNoteReactionChipMotion>(),
    signature,
  }));

  if (state.signature !== signature) {
    setState({
      counts: snapshotStickyNoteReactionCounts(reactions),
      motions: resolveStickyNoteReactionChipMotions(state.counts, reactions),
      signature,
    });
  }

  const onChipAnimationEnd = useCallback((event: AnimationEvent<HTMLElement>, emoji: string) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (!isStickyNoteReactionChipMotionName(event.animationName)) {
      return;
    }
    setState((current) => withoutChipMotion(current, emoji));
  }, []);

  return {
    motionOf: (emoji) => state.motions.get(emoji) ?? null,
    onChipAnimationEnd,
  };
}

function withoutChipMotion<T extends { motions: ReadonlyMap<string, StickyNoteReactionChipMotion> }>(
  current: T,
  emoji: string
): T {
  if (!current.motions.has(emoji)) {
    return current;
  }
  const motions = new Map(current.motions);
  motions.delete(emoji);
  return { ...current, motions };
}
