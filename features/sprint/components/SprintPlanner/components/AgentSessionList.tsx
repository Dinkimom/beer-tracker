'use client';

import type { AgentBridgeStep } from '@/lib/agentSessions/agentBridge';
import type { AgentSession } from '@/lib/agentSessions/agentSession';
import type { KeyboardEvent } from 'react';

import { useRef, useState } from 'react';

import { Icon } from '@/components/Icon';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { useI18n } from '@/contexts/LanguageContext';
import { usePopoverDismiss } from '@/hooks/usePopoverDismiss';

import { AgentSessionListRow } from './AgentSessionListRow';

/**
 * Выпадающий список сессий под заголовком чата — поверх ленты, как выбор сессии в Claude Code:
 * чат под ним остаётся на месте. Поиск по названию и задаче, стрелки и Enter, «Новая сессия»
 * сверху. Закрывается выбором, Escape и кликом мимо (кнопка заголовка сама переключает список).
 */
export function AgentSessionList({
  currentId,
  draftSessionId,
  runs,
  sessions,
  unread,
  onClose,
  onPick,
}: {
  /** Сессия, открытая в чате; null — новая просьба. */
  currentId: string | null;
  draftSessionId: string | null;
  /** Шаг агента по сессиям, где он сейчас работает в мосте. */
  runs: ReadonlyMap<string, AgentBridgeStep>;
  sessions: readonly AgentSession[];
  unread: ReadonlySet<string>;
  onClose: () => void;
  onPick: (sessionId: string | 'new') => void;
}) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  /** «Сейчас» для «N минут назад» — момент открытия списка. */
  const [openedAt] = useState(() => Date.now());
  usePopoverDismiss(onClose, {
    enabled: true,
    // Перехватом: иначе Escape раньше забирают обработчики доски.
    escape: { capture: true },
    ignoreSelector: '[data-agent-session-switcher]',
    primaryButtonOnly: true,
    refs: [rootRef],
  });

  const needle = query.trim().toLowerCase();
  const shown = sessions.filter(
    (session) =>
      !needle ||
      session.title.toLowerCase().includes(needle) ||
      (session.context.taskKey ?? '').toLowerCase().includes(needle)
  );
  const active = Math.min(activeIndex, Math.max(shown.length - 1, 0));

  const statusLine = (session: AgentSession): string => {
    const step = runs.get(session.id);
    if (step) {
      return t(`agentSession.bridgeStep.${step}`);
    }
    return session.status === 'waiting_user' ? t('agentSession.statusWaitingUser') : t('agentSession.waiting');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((active + step + shown.length) % Math.max(shown.length, 1));
    } else if (event.key === 'Enter' && shown[active]) {
      event.preventDefault();
      onPick(shown[active].id);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 ${OVERLAY_FLOATING_ANIMATION}`}
      data-agent-session-list=""
    >
      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" name="search" />
        <input
          aria-label={t('agentSession.sessionsSearch')}
          // Список открыли, чтобы найти сессию: поле сразу в фокусе.
          autoFocus
          className="min-w-0 flex-1 bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100"
          placeholder={t('agentSession.sessionsSearch')}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      <button
        className="flex w-full cursor-pointer items-center gap-2.5 border-b border-gray-200 px-4 py-2 text-left text-xs font-medium text-gray-800 transition-colors hover:bg-gray-500/[0.08] active:bg-gray-500/[0.14] dark:border-gray-700 dark:text-gray-100 dark:hover:bg-white/[0.06]"
        type="button"
        onClick={() => onPick('new')}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400" name="comment-plus" />
        {t('agentSession.newSession')}
      </button>
      <div aria-label={t('agentSession.sessionsAria')} className="agent-chat-scroll max-h-72 space-y-0.5 overflow-y-auto p-1" role="listbox">
        {shown.length === 0 ? (
          <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{t('agentSession.sessionsEmpty')}</p>
        ) : null}
        {shown.map((session, index) => (
          <AgentSessionListRow
            key={session.id}
            active={index === active}
            current={session.id === currentId}
            details={[session.context.taskKey, statusLine(session), session.id === draftSessionId ? t('agentSession.draftOnBoard') : null]
              .filter(Boolean)
              .join(' · ')}
            now={openedAt}
            session={session}
            unread={unread.has(session.id)}
            working={runs.has(session.id)}
            onHover={() => setActiveIndex(index)}
            onPick={() => onPick(session.id)}
          />
        ))}
      </div>
    </div>
  );
}
