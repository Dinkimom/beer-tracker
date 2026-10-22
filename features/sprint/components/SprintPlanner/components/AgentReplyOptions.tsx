'use client';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

const OPTION_CLASS =
  'inline-flex min-h-7 max-w-full items-center gap-1 rounded-lg border px-2.5 py-1 text-left text-[12px] font-medium transition-all duration-200';

const OPTION_ACTIVE_CLASS =
  'cursor-pointer border-green-600/40 text-green-800 hover:bg-green-600/[0.08] active:scale-[0.98] active:bg-green-600/[0.14] dark:border-green-400/40 dark:text-green-200 dark:hover:bg-green-400/[0.1] dark:active:bg-green-400/[0.16]';

const OPTION_CHOSEN_CLASS =
  'border-green-600 bg-green-600/[0.1] text-green-800 dark:border-green-400 dark:bg-green-400/[0.12] dark:text-green-200';

const OPTION_PAST_CLASS = 'border-gray-200 text-gray-400 dark:border-white/10 dark:text-gray-500';

/**
 * Варианты ответа под вопросом агента. Пока ждём ответа (`onPick`) — кнопки; после — след выбора:
 * выбранный вариант подсвечен, остальные приглушены.
 */
export function AgentReplyOptions({
  chosen,
  options,
  onPick,
}: {
  chosen: string | null;
  options: readonly string[];
  /** Нет — вопрос уже отвечен или сессия не ждёт человека. */
  onPick?: (option: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div aria-label={t('agentSession.optionsAria')} className="flex flex-wrap gap-1.5 px-1" data-agent-reply-options="" role="group">
      {options.map((option) =>
        onPick ? (
          <button
            key={option}
            className={`${OPTION_CLASS} ${OPTION_ACTIVE_CLASS}`}
            data-agent-reply-option=""
            type="button"
            onClick={() => onPick(option)}
          >
            {option}
          </button>
        ) : (
          <span key={option} className={`${OPTION_CLASS} ${option === chosen ? OPTION_CHOSEN_CLASS : OPTION_PAST_CLASS}`}>
            {option === chosen ? <Icon className="h-3 w-3 shrink-0" name="check" /> : null}
            {option}
          </span>
        )
      )}
    </div>
  );
}
