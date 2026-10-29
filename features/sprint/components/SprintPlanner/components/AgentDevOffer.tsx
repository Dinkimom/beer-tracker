'use client';

import type { AgentDevRequest } from '@/lib/layers/application/mobx/stores/sprintPlannerUiStore';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

/**
 * Пустой чат, открытый «Агенту» с карточки задачи: можно спросить про задачу (поле ниже) или
 * сразу отдать её агенту сделать в коде — тогда в поле встаёт просьба по задаче, агент стартует
 * по отправке. Вместо двух кнопок в меню карточки — один вход и выбор здесь.
 */
export function AgentDevOffer({ offer, onStart }: { offer: AgentDevRequest | null; onStart: (request: AgentDevRequest) => void }) {
  const { t } = useI18n();
  if (!offer) {
    return null;
  }
  return (
    <div className="space-y-2" data-agent-dev-offer={offer.taskKey}>
      <button
        className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-gray-200 px-3 py-2.5 text-left transition-all duration-200 hover:border-gray-300 hover:bg-gray-500/[0.06] active:scale-[0.98] active:bg-gray-500/[0.1] dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-white/[0.04]"
        type="button"
        onClick={() => onStart(offer)}
      >
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-600/10 text-green-700 dark:bg-green-400/15 dark:text-green-300">
          <Icon className="h-4 w-4" name="code" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{t('agentSession.devOfferTitle')}</span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">{t('agentSession.devOfferHint', { key: offer.taskKey })}</span>
        </span>
      </button>
      <p className="px-1 text-xs text-gray-500 dark:text-gray-400">{t('agentSession.devOfferAsk')}</p>
    </div>
  );
}
