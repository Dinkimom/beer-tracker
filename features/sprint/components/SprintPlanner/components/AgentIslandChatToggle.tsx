'use client';

import type { AgentSessionStatus } from '@/lib/agentSessions/agentSession';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

const DOT_CLASS: Record<AgentSessionStatus, string> = {
  closed: 'bg-gray-400',
  waiting_agent: 'bg-amber-500',
  waiting_user: 'bg-blue-500',
};

const OPEN_CLASS = '!bg-gray-500/[0.14] !text-gray-900 dark:!bg-white/[0.1] dark:!text-white';

/**
 * «Чат» на острове агента: открывает и сворачивает чат, не сдвигаясь; открыт — нажатое состояние.
 * Точка — чья очередь, число — 💬 без ответа агента.
 */
export function AgentIslandChatToggle({
  className,
  open,
  openComments,
  status,
  onToggle,
}: {
  className: string;
  open: boolean;
  openComments: number;
  status?: AgentSessionStatus;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  return (
    <Button
      aria-expanded={open}
      aria-label={open ? t('agentSession.collapseChat') : t('agentSession.chatAria')}
      className={`${className} ${open ? OPEN_CLASS : ''}`}
      data-agent-session-chat-trigger=""
      type="button"
      variant="ghost"
      onClick={onToggle}
    >
      <Icon className="h-3.5 w-3.5" name="comment" />
      <span>{t('agentSession.chatButton')}</span>
      {status ? <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[status]}`} /> : null}
      {openComments > 0 ? (
        <span className="rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold leading-4 text-white">
          {openComments}
        </span>
      ) : null}
    </Button>
  );
}
