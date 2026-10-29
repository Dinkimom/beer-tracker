'use client';

import type { AgentDevResult } from '@/lib/agentSessions/agentSessionKind';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

const TESTS_CLASS: Record<AgentDevResult['tests'], string> = {
  failed: 'text-red-600 dark:text-red-400',
  not_run: 'text-amber-700 dark:text-amber-300',
  passed: 'text-green-700 dark:text-green-400',
};

/**
 * Прежний итог в ленте сессии разработки — одной строкой: ветка и проверки на тот момент. Полная
 * карточка (файлы, дифф, push) — только у последнего итога, иначе лента из одинаковых карточек.
 */
export function AgentDevResultSummary({ result }: { result: AgentDevResult }) {
  const { t } = useI18n();
  return (
    <div className="flex min-w-0 items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400" data-agent-dev-result-summary="">
      <Icon className="h-3 w-3 shrink-0" name="code" />
      <span className="min-w-0 truncate font-mono">{result.branch}</span>
      <span className={`shrink-0 ${TESTS_CLASS[result.tests]}`}>{t(`agentSession.resultTests.${result.tests}`)}</span>
    </div>
  );
}
