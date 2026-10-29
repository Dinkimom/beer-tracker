'use client';

import type { AgentDevResult } from '@/lib/agentSessions/agentSessionKind';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';

const TESTS_CLASS: Record<AgentDevResult['tests'], string> = {
  failed: 'text-red-600 dark:text-red-400',
  not_run: 'text-gray-500 dark:text-gray-400',
  passed: 'text-green-700 dark:text-green-400',
};

const TESTS_ICON: Record<AgentDevResult['tests'], string> = {
  failed: 'x',
  not_run: 'minus',
  passed: 'check',
};

/**
 * Итог сессии разработки под репликой агента: ветка (копируется кликом), проверки, размер diff
 * и коммиты. Push и PR агент не делает — человек смотрит ветку сам.
 */
export function AgentDevResultCard({ result }: { result: AgentDevResult }) {
  const { t } = useI18n();
  const { copied, copy } = useCopyFeedback();
  const hasDiff = result.filesChanged != null;

  return (
    <div className="mt-2 space-y-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-[11px] dark:border-gray-700" data-agent-dev-result="">
      <button
        aria-label={t('agentSession.resultCopyBranch')}
        className="flex max-w-full cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 font-mono text-xs text-gray-900 transition-all duration-200 hover:bg-gray-500/[0.12] active:scale-[0.98] active:bg-gray-500/[0.18] dark:text-gray-100 dark:hover:bg-white/[0.08] dark:active:bg-white/[0.12]"
        title={t('agentSession.resultCopyBranch')}
        type="button"
        onClick={() => {
          copy(result.branch).catch(() => undefined);
        }}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400" name={copied ? 'check' : 'code'} />
        <span className="truncate">{result.branch}</span>
      </button>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-1">
        <span className={`inline-flex items-center gap-1 font-medium ${TESTS_CLASS[result.tests]}`}>
          <Icon className="h-3 w-3" name={TESTS_ICON[result.tests]} />
          {t(`agentSession.resultTests.${result.tests}`)}
        </span>
        {hasDiff ? (
          <span className="text-gray-500 dark:text-gray-400">
            {t('agentSession.resultDiff', {
              deletions: result.deletions ?? 0,
              files: result.filesChanged ?? 0,
              insertions: result.insertions ?? 0,
            })}
          </span>
        ) : null}
      </p>
      {result.commits.length > 0 ? (
        <details className="px-1">
          <summary className="cursor-pointer text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            {t('agentSession.resultCommits', { count: result.commits.length })}
          </summary>
          <ul className="mt-1 space-y-0.5">
            {result.commits.map((commit) => (
              <li key={commit.sha} className="flex gap-2">
                <span className="shrink-0 font-mono text-gray-500 dark:text-gray-400">{commit.sha.slice(0, 7)}</span>
                <span className="min-w-0 truncate text-gray-800 dark:text-gray-200">{commit.subject}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
