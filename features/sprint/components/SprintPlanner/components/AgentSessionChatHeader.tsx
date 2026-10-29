'use client';

import type { AgentSession } from '@/lib/agentSessions/agentSession';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { CONTEXT_MENU_GHOST_BUTTON_RESET } from '@/features/context-menu/contextMenuClasses';

/** Квадратная иконочная кнопка: без горизонтальных отступов, иначе svg сжимается в 24px. */
const HEADER_ICON_CLASS = `${CONTEXT_MENU_GHOST_BUTTON_RESET} !h-6 !min-h-0 !w-6 shrink-0 !rounded-md !p-0 text-gray-500 hover:!bg-gray-500/[0.12] hover:text-gray-700 dark:text-gray-400 dark:hover:!bg-white/[0.08] dark:hover:text-gray-200`;

/**
 * Шапка чата агента. Заголовок — кнопка списка сессий: название показанной сессии, сколько открыто
 * и синяя точка, если агент ответил в другой; в списке — «Сессии с агентом». 🗑 «Очистить чат»
 * завершает показанную сессию.
 */
export function AgentSessionChatHeader({
  listOpen,
  otherUnread,
  session,
  sessionCount,
  onClear,
  onToggleList,
}: {
  listOpen: boolean;
  /** Непрочитанный ответ в сессии, которая сейчас не показана. */
  otherUnread: boolean;
  session: AgentSession | null;
  /** Открытых сессий в спринте. */
  sessionCount: number;
  onClear: () => void;
  onToggleList: () => void;
}) {
  const { t } = useI18n();
  const toggleLabel = listOpen ? t('agentSession.sessionsHide') : t('agentSession.sessionsShow');

  return (
    <div className="flex min-h-6 items-center gap-2">
      <button
        aria-expanded={listOpen}
        aria-label={toggleLabel}
        className="-ml-1 flex min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 text-left transition-all duration-200 hover:bg-gray-500/[0.12] active:scale-[0.98] active:bg-gray-500/[0.18] dark:hover:bg-white/[0.08] dark:active:bg-white/[0.12]"
        data-agent-session-switcher=""
        title={toggleLabel}
        type="button"
        onClick={onToggleList}
      >
        <h3 className="min-w-0 truncate text-xs font-semibold text-gray-900 dark:text-gray-100">
          {listOpen ? t('agentSession.sessionsAria') : (session?.title ?? t('agentSession.newSessionTitle'))}
        </h3>
        {sessionCount > 0 ? (
          <span className="shrink-0 rounded-full bg-gray-500/[0.12] px-1.5 text-[10px] font-semibold leading-4 text-gray-600 dark:bg-white/[0.1] dark:text-gray-300">
            {sessionCount}
          </span>
        ) : null}
        {otherUnread ? (
          <span aria-label={t('agentSession.unreadReply')} className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" role="img" />
        ) : null}
        <Icon
          className={`h-3 w-3 shrink-0 text-gray-500 transition-transform dark:text-gray-400 ${listOpen ? 'rotate-180' : ''}`}
          name="chevron-down"
        />
      </button>
      {!listOpen && session && session.status !== 'closed' ? (
        <Button
          aria-label={t('agentSession.clearChat')}
          className={HEADER_ICON_CLASS}
          data-agent-session-clear=""
          title={t('agentSession.clearChatHint')}
          type="button"
          variant="ghost"
          onClick={onClear}
        >
          <Icon className="h-3.5 w-3.5" name="trash" />
        </Button>
      ) : null}
    </div>
  );
}
