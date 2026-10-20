'use client';

import type { AgentMessageStatus } from './AgentMessageBubble';
import type { AgentSessionItemComment } from '@/lib/agentSessions/agentSession';

import { useI18n } from '@/contexts/LanguageContext';

import { AgentMessageBubble } from './AgentMessageBubble';

const STATUS_KEY: Record<AgentMessageStatus, string> = {
  addressed: 'agentSession.statusAddressed',
  declined: 'agentSession.statusDeclined',
  open: 'agentSession.statusOpen',
};

function itemStatus(item: AgentSessionItemComment): AgentMessageStatus {
  return item.replies.at(-1)?.resolution ?? (item.open ? 'open' : 'addressed');
}

/** 💬 к одному пункту драфта и ответы агента — той же перепиской, что в ленте сессии. */
export function DraftItemCommentThread({
  items,
  onWithdraw,
}: {
  items: readonly AgentSessionItemComment[];
  onWithdraw: (messageId: string) => void;
}) {
  const { t } = useI18n();
  if (items.length === 0) {
    return <p className="text-xs text-gray-500 dark:text-gray-400">{t('agentSession.empty')}</p>;
  }
  return (
    <ul className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
      {items.map((item) => {
        const tone = itemStatus(item);
        return (
          <li key={item.comment.id} className="space-y-1.5" data-draft-item-comment-status={tone}>
            <AgentMessageBubble
              caption={t('agentSession.you')}
              footer={
                item.open ? (
                  <button
                    className="cursor-pointer rounded px-1 text-[11px] text-gray-500 transition-colors hover:bg-gray-500/[0.1] hover:text-red-600 active:bg-gray-500/[0.16] dark:text-gray-400 dark:hover:text-red-400"
                    type="button"
                    onClick={() => onWithdraw(item.comment.id)}
                  >
                    {t('agentSession.withdraw')}
                  </button>
                ) : null
              }
              from="user"
              status={{ label: t(STATUS_KEY[tone]), tone }}
              text={item.comment.text}
            />
            {item.replies.map((reply) => (
              <AgentMessageBubble key={reply.id} caption={t('agentSession.agent')} from="agent" text={reply.text} />
            ))}
          </li>
        );
      })}
    </ul>
  );
}
