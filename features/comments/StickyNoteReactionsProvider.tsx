'use client';

/**
 * Реакции на заметки свимлейна: локальный кэш + persist через API.
 */

import type { StickyNoteReaction } from '@/lib/comments/stickyNoteReaction';
import type { Comment } from '@/types';
import type { Dispatch, ReactNode, SetStateAction } from 'react';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { toggleCommentReaction as persistCommentReaction } from '@/lib/beerTrackerApi';
import {
  commentReactionsByNoteId,
  isStickyNoteReactionEmoji,
  mergeStickyNoteReactionsByNoteId,
  rememberStickyNoteReactionEmoji,
  retainStickyNoteReactionOverlay,
  toggleStickyNoteReaction,
} from '@/lib/comments/stickyNoteReaction';

const EMPTY_REACTIONS: StickyNoteReaction[] = [];
const EMPTY_RECENT: string[] = [];

interface StickyNoteReactionsContextValue {
  byNoteId: Record<string, StickyNoteReaction[]>;
  recentEmojis: string[];
  toggle: (noteId: string, emoji: string) => void;
}

const StickyNoteReactionsContext = createContext<StickyNoteReactionsContextValue | null>(null);

interface StickyNoteReactionsProviderProps {
  children: ReactNode;
  comments?: Comment[];
  sprintId?: number | null;
}

export function StickyNoteReactionsProvider({
  children,
  comments,
  sprintId = null,
}: StickyNoteReactionsProviderProps) {
  const [cachedSprintId, setCachedSprintId] = useState(sprintId);
  const [localByNoteId, setLocalByNoteId] = useState<Record<string, StickyNoteReaction[]>>({});
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const incoming = useMemo(
    () => (comments == null ? {} : commentReactionsByNoteId(comments)),
    [comments]
  );
  const incomingRef = useRef(incoming);
  const [inflightNoteIds, setInflightNoteIds] = useState<Set<string>>(() => new Set());
  const [incomingSnapshot, setIncomingSnapshot] = useState(incoming);
  useEffect(() => {
    incomingRef.current = incoming;
  }, [incoming]);

  if (cachedSprintId !== sprintId) {
    setCachedSprintId(sprintId);
    setInflightNoteIds(new Set());
    setLocalByNoteId({});
  }
  if (incomingSnapshot !== incoming) {
    setIncomingSnapshot(incoming);
    setLocalByNoteId((prev) => retainStickyNoteReactionOverlay(prev, inflightNoteIds));
  }

  const byNoteId = useMemo(
    () => mergeStickyNoteReactionsByNoteId(localByNoteId, incoming),
    [incoming, localByNoteId]
  );

  const toggle = useCallback(
    (noteId: string, emoji: string) => {
      if (!isStickyNoteReactionEmoji(emoji)) {
        return;
      }
      setRecentEmojis((prev) => rememberStickyNoteReactionEmoji(prev, emoji));
      setInflightNoteIds((prev) => withNoteId(prev, noteId, true));
      setLocalByNoteId((prev) => overlayToggle(prev, incomingRef.current, noteId, emoji));
      const commentId = parseSwimlaneCommentTaskId(noteId);
      if (commentId == null || sprintId == null) {
        setInflightNoteIds((prev) => withNoteId(prev, noteId, false));
        return;
      }
      persistReaction(sprintId, commentId, emoji, noteId, incomingRef, setLocalByNoteId, () => {
        setInflightNoteIds((prev) => withNoteId(prev, noteId, false));
      });
    },
    [sprintId]
  );

  const value = useMemo(() => ({ byNoteId, recentEmojis, toggle }), [byNoteId, recentEmojis, toggle]);

  return (
    <StickyNoteReactionsContext.Provider value={value}>{children}</StickyNoteReactionsContext.Provider>
  );
}

export function useStickyNoteReactions(noteId: string): {
  reactions: StickyNoteReaction[];
  recentEmojis: string[];
  toggle: (emoji: string) => void;
} {
  const ctx = useContext(StickyNoteReactionsContext);
  if (ctx == null) {
    return { reactions: EMPTY_REACTIONS, recentEmojis: EMPTY_RECENT, toggle: noopToggle };
  }
  return {
    reactions: ctx.byNoteId[noteId] ?? EMPTY_REACTIONS,
    recentEmojis: ctx.recentEmojis,
    toggle: (emoji) => {
      ctx.toggle(noteId, emoji);
    },
  };
}

function overlayToggle(
  local: Record<string, StickyNoteReaction[]>,
  incoming: Record<string, StickyNoteReaction[]>,
  noteId: string,
  emoji: string
): Record<string, StickyNoteReaction[]> {
  const displayed = mergeStickyNoteReactionsByNoteId(local, incoming);
  const nextReactions = toggleStickyNoteReaction(displayed[noteId] ?? EMPTY_REACTIONS, emoji);
  return { ...local, [noteId]: nextReactions };
}

function persistReaction(
  sprintId: number,
  commentId: string,
  emoji: string,
  noteId: string,
  incomingRef: { current: Record<string, StickyNoteReaction[]> },
  setLocalByNoteId: Dispatch<SetStateAction<Record<string, StickyNoteReaction[]>>>,
  onSettled: () => void
): void {
  persistCommentReaction(sprintId, commentId, emoji)
    .then((reactions) => {
      if (reactions == null) {
        setLocalByNoteId((prev) => overlayToggle(prev, incomingRef.current, noteId, emoji));
        return;
      }
      setLocalByNoteId((prev) => ({ ...prev, [noteId]: reactions }));
    })
    .catch(() => {
      setLocalByNoteId((prev) => overlayToggle(prev, incomingRef.current, noteId, emoji));
    })
    .finally(onSettled);
}

function withNoteId(prev: Set<string>, noteId: string, present: boolean): Set<string> {
  const next = new Set(prev);
  if (present) {
    next.add(noteId);
  } else {
    next.delete(noteId);
  }
  return next;
}

function noopToggle(): void {
  // Вне планера реакций нет — TaskBar в тестах/сторизах не падает.
}
