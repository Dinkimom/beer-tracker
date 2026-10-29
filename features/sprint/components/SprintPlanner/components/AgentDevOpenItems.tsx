'use client';

import { useI18n } from '@/contexts/LanguageContext';

/**
 * Что агент из задачи не сделал (вне объёма, заблокировано, нужно решение) — отдельно от отчёта,
 * чтобы не утонуло в тексте. «Доделать» отдаёт пункт агенту репликой в ту же сессию.
 */
export function AgentDevOpenItems({ items, onAsk }: { items: readonly string[]; onAsk?: (text: string) => void }) {
  const { t } = useI18n();
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="space-y-1 rounded-md bg-amber-500/[0.08] px-2 py-1.5" data-agent-dev-open-items="">
      <p className="font-medium text-amber-800 dark:text-amber-300">{t('agentSession.resultOpenItems')}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="min-w-0 flex-1 text-gray-800 dark:text-gray-200">{item}</span>
            {onAsk ? (
              <button
                className="shrink-0 cursor-pointer rounded-md px-1.5 font-medium text-amber-800 transition-all duration-200 hover:bg-amber-500/[0.15] active:scale-[0.98] active:bg-amber-500/[0.22] dark:text-amber-300"
                type="button"
                onClick={() => onAsk(t('agentSession.resultFinishMessage', { item }))}
              >
                {t('agentSession.resultFinish')}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
