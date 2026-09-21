'use client';

import type { Developer } from '@/types';
import type { RefObject } from 'react';

import { useCallback, useMemo, useState } from 'react';

import {
  filterMentionCandidates,
  getMentionQueryAtCaret,
  insertStickyNoteMentionToken,
} from '@/lib/comments/stickyNoteMentions';

interface UseCommentMentionAutocompleteInput {
  developers: readonly Developer[];
  text: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onTextChange: (value: string) => void;
}

export function useCommentMentionAutocomplete({
  developers,
  onTextChange,
  text,
  textareaRef,
}: UseCommentMentionAutocompleteInput) {
  const [caretIndex, setCaretIndex] = useState(text.length);
  const [activeIndex, setActiveIndex] = useState(0);

  const syncCaretFromTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    setCaretIndex(textarea.selectionStart ?? text.length);
  }, [text.length, textareaRef]);

  const mentionQuery = useMemo(
    () => getMentionQueryAtCaret(text, caretIndex),
    [caretIndex, text]
  );

  const candidates = useMemo(() => {
    if (!mentionQuery) {
      return [];
    }
    return filterMentionCandidates(developers, mentionQuery.query);
  }, [developers, mentionQuery]);

  const isOpen = mentionQuery != null && candidates.length > 0;

  const selectDeveloper = useCallback(
    (developer: Developer) => {
      const textarea = textareaRef.current;
      if (!textarea || !mentionQuery) {
        return;
      }
      const { nextCaret, nextText } = insertStickyNoteMentionToken({
        caret: textarea.selectionStart ?? caretIndex,
        developer,
        mentionStart: mentionQuery.start,
        text,
      });
      onTextChange(nextText);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(nextCaret, nextCaret);
        setCaretIndex(nextCaret);
      });
      setActiveIndex(0);
    },
    [caretIndex, mentionQuery, onTextChange, text, textareaRef]
  );

  const handleTextareaChange = useCallback(
    (value: string, selectionStart: number) => {
      onTextChange(value);
      setCaretIndex(selectionStart);
      setActiveIndex(0);
    },
    [onTextChange]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (!isOpen || candidates.length === 0) {
        return false;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % candidates.length);
        return true;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((current) => (current - 1 + candidates.length) % candidates.length);
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
        return true;
      }
      return false;
    },
    [activeIndex, candidates, isOpen, selectDeveloper]
  );

  return {
    activeIndex,
    candidates,
    handleKeyDown,
    handleTextareaChange,
    isOpen,
    selectDeveloper,
    syncCaretFromTextarea,
  };
}
