'use client';

import type { Developer } from '@/types';
import type { Editor } from '@tiptap/react';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  filterMentionCandidates,
  formatStickyNoteMentionToken,
  getMentionQueryAtCaret,
  splitStickyNoteTextByMentions,
} from '@/lib/comments/stickyNoteMentions';
import { STICKY_NOTE_MENTION_NODE } from '@/lib/comments/stickyNoteRichDoc';

interface MentionQuery {
  from: number;
  query: string;
  to: number;
}

/** Неделимые узлы (упоминания) — один символ, как и их размер в документе. */
const LEAF_PLACEHOLDER = '￼';

function readMentionQuery(editor: Editor): MentionQuery | null {
  const { $from, empty } = editor.state.selection;
  if (!empty || !$from.parent.isTextblock) {
    return null;
  }
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, LEAF_PLACEHOLDER);
  const match = getMentionQueryAtCaret(before, before.length);
  if (!match) {
    return null;
  }
  return { from: $from.pos - (before.length - match.start), query: match.query, to: $from.pos };
}

/** Атрибуты упоминания с той же чисткой имени и id, что у токена `@[Имя](id)`. */
function mentionAttrs(developer: Developer): { id: string; name: string } {
  const [segment] = splitStickyNoteTextByMentions(formatStickyNoteMentionToken(developer));
  return segment?.type === 'mention'
    ? { id: segment.id, name: segment.name }
    : { id: developer.id, name: developer.name };
}

/** Подсказка `@упоминаний` для WYSIWYG-редактора заметки. */
export function useStickyNoteRichEditorMentions(
  editor: Editor | null,
  developers: readonly Developer[]
) {
  const [query, setQuery] = useState<MentionQuery | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // Esc прячет подсказку, пока не начнётся новое `@`.
  const [dismissedFrom, setDismissedFrom] = useState<number | null>(null);
  const queryKeyRef = useRef('');

  useEffect(() => {
    if (!editor) {
      return;
    }
    const update = () => {
      const next = readMentionQuery(editor);
      const key = next ? `${next.from}:${next.query}` : '';
      if (key !== queryKeyRef.current) {
        queryKeyRef.current = key;
        setActiveIndex(0);
      }
      setQuery(next);
    };
    editor.on('transaction', update);
    return () => {
      editor.off('transaction', update);
    };
  }, [editor]);

  const candidates = useMemo(
    () => (query ? filterMentionCandidates(developers, query.query) : []),
    [developers, query]
  );
  const isOpen = query != null && candidates.length > 0 && dismissedFrom !== query.from;

  const selectDeveloper = useCallback(
    (developer: Developer) => {
      if (!editor || !query) {
        return;
      }
      editor
        .chain()
        .focus()
        .insertContentAt({ from: query.from, to: query.to }, [
          { attrs: mentionAttrs(developer), type: STICKY_NOTE_MENTION_NODE },
          { text: ' ', type: 'text' },
        ])
        .run();
    },
    [editor, query]
  );

  /** `true` — клавишу съела подсказка, редактору её не отдавать. */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent): boolean => {
      if (!isOpen || !query) {
        return false;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((current) => (current + step + candidates.length) % candidates.length);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        const selected = candidates[activeIndex] ?? candidates[0];
        if (selected) {
          selectDeveloper(selected);
        }
        return true;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setDismissedFrom(query.from);
        return true;
      }
      return false;
    },
    [activeIndex, candidates, isOpen, query, selectDeveloper]
  );

  return { activeIndex, candidates, handleKeyDown, isOpen, selectDeveloper };
}
