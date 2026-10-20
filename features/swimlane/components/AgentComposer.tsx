'use client';

import type { AgentMention } from '@/lib/agentSessions/agentMentions';
import type { KeyboardEvent } from 'react';

import { useLayoutEffect, useRef } from 'react';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { AGENT_SESSION_TEXT_MAX } from '@/lib/agentSessions/agentSession';

import { useAgentComposerMentions } from '../hooks/useAgentComposerMentions';
import { useAgentMentionCandidates } from '../hooks/useAgentMentionCandidates';

import { AGENT_MENTION_ICON, AgentMentionList } from './AgentMentionList';

const MAX_HEIGHT_PX = 220;

/**
 * Поле просьбы агенту, как в чате: растёт по тексту, Enter — отправить, Shift+Enter — новая строка,
 * «@» — упомянуть задачу или человека. `context` — неснимаемые плашки того, откуда открыли (задача, заметка).
 */
export function AgentComposer({
  allowEmpty = false,
  autoFocus = false,
  context = [],
  disabled = false,
  mentions,
  placeholder,
  sprintId,
  text,
  onMentionsChange,
  onSubmit,
  onTextChange,
}: {
  /** «Попросить переделать» можно отправить без текста. */
  allowEmpty?: boolean;
  autoFocus?: boolean;
  context?: readonly AgentMention[];
  disabled?: boolean;
  mentions: readonly AgentMention[];
  placeholder: string;
  /** Спринт, из задач и людей которого предлагаем «@». */
  sprintId: number | null | undefined;
  text: string;
  onMentionsChange: (mentions: AgentMention[]) => void;
  onSubmit: () => void;
  onTextChange: (text: string) => void;
}) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const candidates = useAgentMentionCandidates(sprintId);
  const popup = useAgentComposerMentions({
    candidates,
    mentions,
    onMentionsChange,
    onTextChange,
    text,
    textareaRef,
  });
  const canSubmit = !disabled && (allowEmpty || text.trim().length > 0);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [text]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (popup.handleKeyDown(event)) {
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (canSubmit) {
        onSubmit();
      }
    }
  };

  return (
    <div
      className="relative rounded-xl border border-gray-300 bg-white transition-colors focus-within:border-blue-500 dark:border-gray-600 dark:bg-gray-900/40 dark:focus-within:border-blue-400"
      data-agent-composer=""
    >
      {popup.isOpen ? (
        <AgentMentionList
          activeIndex={popup.activeIndex}
          options={popup.options}
          onHover={popup.setActiveIndex}
          onSelect={popup.select}
        />
      ) : null}
      {context.length > 0 ? (
        <div className="flex flex-wrap gap-1 px-3 pt-2.5">
          {context.map((item) => (
            <span
              key={`${item.kind}:${item.id}`}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-gray-700/70 dark:text-gray-200"
            >
              <Icon className="h-3 w-3 shrink-0" name={AGENT_MENTION_ICON[item.kind]} />
              <span className="truncate">{item.label}</span>
            </span>
          ))}
        </div>
      ) : null}
      <textarea
        ref={textareaRef}
        aria-label={placeholder}
        autoFocus={autoFocus}
        className="block w-full resize-none bg-transparent px-3 pb-1 pt-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
        disabled={disabled}
        maxLength={AGENT_SESSION_TEXT_MAX}
        placeholder={placeholder}
        rows={2}
        value={text}
        onChange={(event) => {
          onTextChange(event.target.value);
          popup.syncCaret();
        }}
        onClick={popup.syncCaret}
        onKeyDown={onKeyDown}
        onKeyUp={popup.syncCaret}
      />
      <div className="flex items-center gap-2 px-3 pb-2">
        <span className="min-w-0 flex-1 truncate text-[11px] text-gray-400 dark:text-gray-500">
          {t('agentSession.composerHint')}
        </span>
        <button
          aria-label={t('agentSession.submit')}
          className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-blue-600 text-white transition-all duration-200 hover:bg-blue-700 active:scale-[0.98] active:bg-blue-800 disabled:pointer-events-none disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-400"
          data-agent-composer-submit=""
          disabled={!canSubmit}
          type="button"
          onClick={onSubmit}
        >
          <Icon className="h-4 w-4" name="arrow-right" />
        </button>
      </div>
    </div>
  );
}
