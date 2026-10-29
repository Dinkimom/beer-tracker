'use client';

import type { AgentSession } from '@/lib/agentSessions/agentSession';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** «5 мин назад», «вчера» — на языке интерфейса; меньше минуты — «сейчас». */
function relativeTime(iso: string, language: string, now: number): string {
  const diff = Date.parse(iso) - now;
  const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto', style: 'short' });
  if (Math.abs(diff) < MINUTE) {
    return format.format(0, 'second');
  }
  if (Math.abs(diff) < HOUR) {
    return format.format(Math.round(diff / MINUTE), 'minute');
  }
  if (Math.abs(diff) < DAY) {
    return format.format(Math.round(diff / HOUR), 'hour');
  }
  return format.format(Math.round(diff / DAY), 'day');
}

/**
 * Сессия в списке: точка — чья очередь (пульсирует, пока агент работает в мосте), название
 * (у сессий разработки — значок кода), подпись — задача, что агент делает или что ждут тебя,
 * драфт на доске; справа — когда обновлялась и синяя точка непрочитанного ответа.
 */
export function AgentSessionListRow({
  active,
  current,
  details,
  now,
  session,
  unread,
  working,
  onHover,
  onPick,
}: {
  /** Подсвечена стрелками или мышью. */
  active: boolean;
  /** Открыта в чате. */
  current: boolean;
  details: string;
  /** «Сейчас» для «N минут назад». */
  now: number;
  session: AgentSession;
  unread: boolean;
  working: boolean;
  onHover: () => void;
  onPick: () => void;
}) {
  const { language, t } = useI18n();
  return (
    <button
      aria-current={current ? 'true' : undefined}
      aria-selected={active}
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors ${active ? 'bg-gray-500/[0.1] dark:bg-white/[0.08]' : ''}`}
      data-agent-session-row={session.id}
      role="option"
      type="button"
      onClick={onPick}
      onMouseEnter={onHover}
    >
      <span aria-hidden className="relative flex h-2 w-2 shrink-0">
        {working ? <span className="absolute inset-0 rounded-full bg-amber-500 opacity-75 motion-safe:animate-ping" /> : null}
        <span className={`relative h-2 w-2 rounded-full ${session.status === 'waiting_user' ? 'bg-blue-500' : 'bg-amber-500'}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1 text-xs font-medium text-gray-900 dark:text-gray-100">
          {session.kind === 'dev' ? (
            <Icon aria-label={t('agentSession.devSession')} className="h-3 w-3 shrink-0 text-gray-500 dark:text-gray-400" name="code" />
          ) : null}
          <span className="truncate">{session.title}</span>
          {current ? <Icon className="h-3 w-3 shrink-0 text-gray-500 dark:text-gray-400" name="check" /> : null}
        </span>
        <span className="block truncate text-[11px] text-gray-500 dark:text-gray-400">{details}</span>
      </span>
      <span className="shrink-0 text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
        {relativeTime(session.updatedAt, language, now)}
      </span>
      {unread ? <span aria-label={t('agentSession.unreadReply')} className="h-2 w-2 shrink-0 rounded-full bg-blue-600" role="img" /> : null}
    </button>
  );
}
