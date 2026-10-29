'use client';

import type { AgentBridgeStep } from '@/lib/agentSessions/agentBridge';
import type { AgentSession } from '@/lib/agentSessions/agentSession';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

const ROW_CLASS =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-all duration-200 hover:bg-gray-500/[0.08] active:scale-[0.98] active:bg-gray-500/[0.14] dark:hover:bg-white/[0.06] dark:active:bg-white/[0.1]';

/**
 * Список открытых сессий острова агента — на месте ленты чата. Сверху «Новая сессия», дальше
 * сессии, свежие сверху (у сессий разработки — значок кода): точка — чья очередь (пульсирует, пока агент работает в мосте), подпись —
 * задача, что агент делает или что ждут тебя, пометка драфта на доске; синяя точка справа — ответ,
 * которого ты ещё не видел. Клик открывает сессию в чате.
 */
export function AgentSessionList({
  currentId,
  draftSessionId,
  runs,
  sessions,
  unread,
  onPick,
}: {
  /** Сессия, открытая в чате; null — новая просьба. */
  currentId: string | null;
  draftSessionId: string | null;
  /** Шаг агента по сессиям, где он сейчас работает в мосте. */
  runs: ReadonlyMap<string, AgentBridgeStep>;
  sessions: readonly AgentSession[];
  unread: ReadonlySet<string>;
  onPick: (sessionId: string | 'new') => void;
}) {
  const { t } = useI18n();

  const statusLine = (session: AgentSession): string => {
    const step = runs.get(session.id);
    if (step) {
      return t(`agentSession.bridgeStep.${step}`);
    }
    return session.status === 'waiting_user' ? t('agentSession.statusWaitingUser') : t('agentSession.waiting');
  };

  return (
    <ul aria-label={t('agentSession.sessionsAria')} className="agent-chat-scroll -mr-3 max-h-[min(22rem,50vh)] space-y-0.5 overflow-y-auto pr-3" data-agent-session-list="">
      <li>
        <button
          aria-current={currentId == null ? 'true' : undefined}
          className={`${ROW_CLASS} ${currentId == null ? 'bg-gray-500/[0.08] dark:bg-white/[0.06]' : ''}`}
          type="button"
          onClick={() => onPick('new')}
        >
          <Icon className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400" name="comment-plus" />
          <span className="text-xs font-medium text-gray-800 dark:text-gray-100">{t('agentSession.newSession')}</span>
        </button>
      </li>
      {sessions.map((session) => {
        const working = runs.has(session.id);
        const current = session.id === currentId;
        const details = [session.context.taskKey, statusLine(session), session.id === draftSessionId ? t('agentSession.draftOnBoard') : null]
          .filter(Boolean)
          .join(' · ');
        return (
          <li key={session.id}>
            <button
              aria-current={current ? 'true' : undefined}
              className={`${ROW_CLASS} ${current ? 'bg-gray-500/[0.08] dark:bg-white/[0.06]' : ''}`}
              data-agent-session-row={session.id}
              type="button"
              onClick={() => onPick(session.id)}
            >
              <span aria-hidden className="relative flex h-2 w-2 shrink-0">
                {working ? <span className="absolute inset-0 rounded-full bg-amber-500 opacity-75 motion-safe:animate-ping" /> : null}
                <span
                  className={`relative h-2 w-2 rounded-full ${session.status === 'waiting_user' ? 'bg-blue-500' : 'bg-amber-500'}`}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1 text-xs font-medium text-gray-900 dark:text-gray-100">
                  {session.kind === 'dev' ? (
                    <Icon aria-label={t('agentSession.devSession')} className="h-3 w-3 shrink-0 text-gray-500 dark:text-gray-400" name="code" />
                  ) : null}
                  <span className="truncate">{session.title}</span>
                </span>
                <span className="block truncate text-[11px] text-gray-500 dark:text-gray-400">{details}</span>
              </span>
              {unread.has(session.id) ? (
                <span aria-label={t('agentSession.unreadReply')} className="h-2 w-2 shrink-0 rounded-full bg-blue-600" role="img" />
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
