'use client';

import type { AgentSessionMessage, AgentSessionStatus } from '@/lib/agentSessions/agentSession';

import { type ReactNode, useLayoutEffect, useRef } from 'react';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { AgentMessageBubble } from '@/features/swimlane/components/AgentMessageBubble';
import { mcpOAuthClientBrandName } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';

type Translate = (key: string, params?: Record<string, number | string>) => string;

/** Кто написал: «Ты», клиент агента (Claude, Cursor…) или просто «Агент». */
function messageAuthor(message: AgentSessionMessage, t: Translate): string {
  if (message.authorKind === 'user') {
    return t('agentSession.you');
  }
  return (message.clientBrand && mcpOAuthClientBrandName(message.clientBrand)) || t('agentSession.agent');
}

/** Подпись реплики: кто и что это (драфт vN, просьба переделать, 💬 или ответ к пункту). */
function messageCaption(message: AgentSessionMessage, draftVersion: number, t: Translate): string {
  const who = messageAuthor(message, t);
  if (message.kind === 'draft') {
    return `${who} · ${t('agentSession.kindDraft', { version: draftVersion })}`;
  }
  if (message.kind === 'redo') {
    return `${who} · ${t('agentSession.kindRedo')}`;
  }
  if ((message.kind === 'comment' || message.kind === 'reply') && message.target) {
    return `${who} · ${t('agentSession.kindComment', { label: message.target.label ?? message.target.id })}`;
  }
  return who;
}

function messageStatus(message: AgentSessionMessage, t: Translate) {
  if (!message.resolution) {
    return undefined;
  }
  return {
    label: message.resolution === 'addressed' ? t('agentSession.statusAddressed') : t('agentSession.statusDeclined'),
    tone: message.resolution,
  };
}

/**
 * Хвост ленты на месте следующей реплики: агент «печатает» или сессия завершена.
 * `waitingDetail` — что агент делает прямо сейчас (мост к Claude CLI), вместо «Ждёт агента».
 */
function conversationTail(status: AgentSessionStatus | undefined, waitingDetail: ReactNode, t: Translate) {
  if (status === 'waiting_agent') {
    return (
      <li className="flex" data-agent-session-tail="waiting">
        <span className="inline-flex items-center gap-1.5 px-1 text-[12px] text-gray-500 dark:text-gray-400">
          <span aria-hidden className="inline-flex gap-0.5">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="h-1 w-1 animate-pulse rounded-full bg-green-600 dark:bg-green-400"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </span>
          {waitingDetail ?? t('agentSession.waiting')}
        </span>
      </li>
    );
  }
  if (status === 'closed') {
    return (
      <li className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500" data-agent-session-tail="closed">
        <span aria-hidden className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        {t('agentSession.statusClosed')}
        <span aria-hidden className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      </li>
    );
  }
  return null;
}

/** Лента сессии сверху вниз; прокручена к последнему сообщению, в конце — статус сессии. */
export function AgentSessionConversation({
  empty,
  messages,
  status,
  waitingDetail,
}: {
  empty: string;
  messages: readonly AgentSessionMessage[];
  status?: AgentSessionStatus;
  waitingDetail?: ReactNode;
}) {
  const { t } = useI18n();
  const listRef = useRef<HTMLOListElement>(null);
  let draftVersion = 0;
  const versions = new Map<string, number>();
  for (const message of messages) {
    if (message.kind === 'draft') {
      draftVersion += 1;
      versions.set(message.id, draftVersion);
    }
  }

  useLayoutEffect(() => {
    const list = listRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages.length, status]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-5 text-center" data-agent-session-empty="">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600/10 text-green-700 dark:bg-green-400/15 dark:text-green-300">
          <Icon className="h-4 w-4" name="sparkles" />
        </span>
        <p className="max-w-[18rem] text-balance text-xs leading-relaxed text-gray-500 dark:text-gray-400">{empty}</p>
      </div>
    );
  }
  return (
    // -mr-3 pr-3: скроллбар уходит в паддинг панели (p-3) и встаёт у её правой границы, а не поверх реплик.
    <ol
      ref={listRef}
      className="-mr-3 max-h-[min(22rem,50vh)] space-y-2.5 overflow-y-auto pr-3"
      data-agent-session-conversation=""
    >
      {messages.map((message) => (
        <li key={message.id} data-agent-session-message={message.kind}>
          <AgentMessageBubble
            brand={message.clientBrand}
            caption={messageCaption(message, versions.get(message.id) ?? 0, t)}
            card={message.kind === 'draft'}
            from={message.authorKind}
            placeholder={t('agentSession.kindRedo')}
            status={messageStatus(message, t)}
            text={message.text}
          />
        </li>
      ))}
      {conversationTail(status, waitingDetail, t)}
    </ol>
  );
}
