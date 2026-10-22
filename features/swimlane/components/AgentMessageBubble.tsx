'use client';

import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';
import type { ReactNode } from 'react';

import { McpOAuthClientMark } from '@/app/mcp/oauth/consent/McpOAuthClientMark';
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

const USER_BUBBLE_CLASS =
  'max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 px-3 py-1.5 text-[13px] leading-snug text-white dark:bg-blue-500/80';

const AGENT_TEXT_CLASS = 'w-full px-1 text-[13px] leading-relaxed text-gray-800 dark:text-gray-100';

/** Драфт — не реплика, а событие на доске: карточкой, а не текстом. */
const AGENT_CARD_CLASS =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] leading-relaxed text-gray-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-100';

function bodyClassFor(fromAgent: boolean, card: boolean): string {
  if (!fromAgent) {
    return USER_BUBBLE_CLASS;
  }
  return card ? AGENT_CARD_CLASS : AGENT_TEXT_CLASS;
}

/** Значок в подписи ответа агента: клиент MCP, если известен, иначе общий значок агента. */
function agentMark(brand: McpOAuthClientBrand | undefined, label: string): ReactNode {
  if (brand) {
    return <McpOAuthClientMark brand={brand} label={label} size="compact" />;
  }
  return <Icon className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" name="sparkles" />;
}

/**
 * Одна реплика переписки с агентом — одинаково в ленте сессии и 💬 у пункта, как в AI-чатах:
 * свои сообщения синим пузырём справа, ответ агента — текстом на всю ширину (длинные ответы так
 * читаются), над ним значок клиента MCP (Claude, Cursor…) и подпись.
 */
export function AgentMessageBubble({
  brand,
  caption,
  card = false,
  footer,
  from,
  placeholder,
  status,
  text,
}: {
  /** Каким клиентом писал агент; нет — общий значок агента. */
  brand?: McpOAuthClientBrand;
  /** «Ты · Драфт v2», «Claude · К пункту: …». */
  caption?: string;
  /** Ответ агента карточкой (драфт). */
  card?: boolean;
  /** Под репликой: например «Отозвать». */
  footer?: ReactNode;
  from: 'agent' | 'user';
  /** Если текста нет (просьба переделать без комментария) — курсивом вместо него. */
  placeholder?: string;
  status?: { label: string; tone: AgentMessageStatus };
  text: string;
}) {
  const fromAgent = from === 'agent';
  return (
    <div className={`flex flex-col gap-1 ${fromAgent ? 'items-start' : 'items-end'}`} data-agent-message={from}>
      {caption || status ? (
        <div className="flex max-w-full items-center gap-1.5 px-1 text-[11px] text-gray-500 dark:text-gray-400">
          {fromAgent ? agentMark(brand, caption ?? '') : null}
          {caption ? <span className={`min-w-0 truncate ${fromAgent ? 'font-medium' : ''}`}>{caption}</span> : null}
          {status ? (
            <span className={`inline-flex shrink-0 items-center gap-0.5 ${STATUS_CLASS[status.tone]}`}>
              <Icon className="h-3 w-3" name={STATUS_ICON[status.tone]} />
              {status.label}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className={`break-words ${bodyClassFor(fromAgent, card)} ${text ? '' : 'italic opacity-80'}`}>
        {text ? <AgentMessageText surface={fromAgent ? 'plain' : 'bubble'} text={text} /> : placeholder}
      </div>
      {footer}
    </div>
  );
}
