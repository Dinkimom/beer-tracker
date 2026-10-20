'use client';

import type { AgentMention, AgentMentionCandidate } from '@/lib/agentSessions/agentMentions';
import type { KeyboardEvent, RefObject } from 'react';

import { useCallback, useMemo, useState } from 'react';

import { filterAgentMentionCandidates, insertAgentMention } from '@/lib/agentSessions/agentMentions';
import { getMentionQueryAtCaret } from '@/lib/comments/stickyNoteMentions';

/**
 * «@» в поле просьбы агенту: запрос у курсора, список кандидатов, выбор стрелками / Enter / Tab.
 * Esc закрывает только список (не окно), пока курсор не уйдёт с этого «@».
 */
export function useAgentComposerMentions(input: {
  candidates: readonly AgentMentionCandidate[];
  mentions: readonly AgentMention[];
  text: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onMentionsChange: (mentions: AgentMention[]) => void;
  onTextChange: (text: string) => void;
}) {
  const { candidates, mentions, onMentionsChange, onTextChange, text, textareaRef } = input;
  const [caret, setCaret] = useState(text.length);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedStart, setDismissedStart] = useState<number | null>(null);

  const query = useMemo(() => getMentionQueryAtCaret(text, caret), [caret, text]);
  const options = useMemo(
    () => (query ? filterAgentMentionCandidates(candidates, query.query) : []),
    [candidates, query]
  );
  const isOpen = query != null && options.length > 0 && dismissedStart !== query.start;

  const select = useCallback(
    (candidate: AgentMentionCandidate) => {
      const textarea = textareaRef.current;
      if (!query) {
        return;
      }
      const { nextCaret, nextText } = insertAgentMention({
        caret: textarea?.selectionStart ?? caret,
        label: candidate.label,
        mentionStart: query.start,
        text,
      });
      onTextChange(nextText);
      onMentionsChange([...mentions, { id: candidate.id, kind: candidate.kind, label: candidate.label }]);
      setActiveIndex(0);
      requestAnimationFrame(() => {
        textarea?.focus();
        textarea?.setSelectionRange(nextCaret, nextCaret);
        setCaret(nextCaret);
      });
    },
    [caret, mentions, onMentionsChange, onTextChange, query, text, textareaRef]
  );

  const syncCaret = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      setCaret(textarea.selectionStart ?? textarea.value.length);
    }
  }, [textareaRef]);

  /** true — клавишу обработал список упоминаний. */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (!isOpen || !query) {
        return false;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((current) => (current + step + options.length) % options.length);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        const candidate = options[activeIndex] ?? options[0];
        if (candidate) {
          select(candidate);
        }
        return true;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setDismissedStart(query.start);
        return true;
      }
      return false;
    },
    [activeIndex, isOpen, options, query, select]
  );

  return {
    activeIndex: Math.min(activeIndex, Math.max(options.length - 1, 0)),
    handleKeyDown,
    isOpen,
    options,
    select,
    setActiveIndex,
    syncCaret,
  };
}
