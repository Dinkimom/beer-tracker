'use client';

import type { ReactNode } from 'react';

import { Icon } from '@/components/Icon';

import { AgentMessageText } from './AgentMessageText';

export type AgentMessageStatus = 'addressed' | 'declined' | 'open';

const STATUS_CLASS: Record<AgentMessageStatus, string> = {
  addressed: 'text-green-700 dark:text-green-400',
  declined: 'text-amber-700 dark:text-amber-400',
  open: 'text-gray-500 dark:text-gray-400',
};

const STATUS_ICON: Record<AgentMessageStatus, string> = {
  addressed: 'check-circle',
  declined: 'circle-x',
  open: 'clock',
};

const BUBBLE_CLASS = {
  agent: 'rounded-2xl rounded-bl-md bg-green-600 text-white dark:bg-green-600/90',
  user: 'rounded-2xl rounded-br-md bg-blue-600 text-white dark:bg-blue-500/80',
} as const;

/**
 * Одна реплика переписки с агентом — одинаково в окне «Агенту», ленте сессии и 💬 у пункта:
 * свои сообщения синим пузырём справа, агента — зелёным слева (как в iMessage); над пузырём подпись и статус.
 */
export function AgentMessageBubble({
  caption,
  footer,
  from,
  placeholder,
  status,
  text,
}: {
  /** «Ты · Драфт v2», «Агент · К пункту: …». */
  caption?: string;
  /** Под пузырём: например «Отозвать». */
  footer?: ReactNode;
  from: 'agent' | 'user';
  /** Если текста нет (просьба переделать без комментария) — курсивом вместо него. */
  placeholder?: string;
  status?: { label: string; tone: AgentMessageStatus };
  text: string;
}) {
  const alignClass = from === 'user' ? 'items-end' : 'items-start';
  return (
    <div className={`flex flex-col gap-0.5 ${alignClass}`} data-agent-message={from}>
      {caption || status ? (
        <div className="flex max-w-[85%] items-center gap-1.5 px-1 text-[11px] text-gray-500 dark:text-gray-400">
          {caption ? <span className="min-w-0 truncate">{caption}</span> : null}
          {status ? (
            <span className={`inline-flex shrink-0 items-center gap-0.5 ${STATUS_CLASS[status.tone]}`}>
              <Icon className="h-3 w-3" name={STATUS_ICON[status.tone]} />
              {status.label}
            </span>
          ) : null}
        </div>
      ) : null}
      <p
        className={`max-w-[85%] whitespace-pre-wrap break-words px-3 py-1.5 text-[13px] leading-snug ${BUBBLE_CLASS[from]} ${
          text ? '' : 'italic opacity-80'
        }`}
      >
        {text ? <AgentMessageText text={text} /> : placeholder}
      </p>
      {footer}
    </div>
  );
}
