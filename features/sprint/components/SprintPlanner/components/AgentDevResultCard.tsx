'use client';

import type { AgentDevResult } from '@/lib/agentSessions/agentSessionKind';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { useAgentBridgeWorkspace } from '@/features/swimlane/hooks/useAgentBridge';

import { AgentDevOpenItems } from './AgentDevOpenItems';
import { AgentDevResultActions } from './AgentDevResultActions';
import { AgentDevResultFiles } from './AgentDevResultFiles';

const TESTS_CLASS: Record<AgentDevResult['tests'], string> = {
  failed: 'text-red-600 dark:text-red-400',
  // Не прогнанные проверки — тоже повод остановиться перед push.
  not_run: 'text-amber-700 dark:text-amber-300',
  passed: 'text-green-700 dark:text-green-400',
};

const TESTS_ICON: Record<AgentDevResult['tests'], string> = {
  failed: 'x',
  not_run: 'alert-triangle',
  passed: 'check',
};

const CHIP_CLASS = 'shrink-0 rounded-full px-1.5 text-[10px] font-medium leading-4';

/**
 * Итог сессии разработки над отчётом агента. С мостом — живая ветка из git: файлы с +/− (клик
 * открывает файл в VS Code), запушено ли, «Запушить и открыть MR». Без моста — то, что агент сам
 * сообщил. Ниже — что агент не сделал: пункт можно отдать ему «Доделать».
 */
export function AgentDevResultCard({
  result,
  sessionId,
  onAsk,
}: {
  result: AgentDevResult;
  sessionId: string | null;
  /** Реплика агенту от имени человека; нет — сессия не принимает реплик (закрыта, агент работает). */
  onAsk?: (text: string) => void;
}) {
  const { t } = useI18n();
  const { push, pushing, workspace } = useAgentBridgeWorkspace(sessionId);
  const review = workspace?.review ?? null;
  const repo = workspace?.repo.split('/').filter(Boolean).at(-1);
  const commits = review?.commits ?? result.commits;

  return (
    <div className="w-full space-y-2 rounded-lg border border-gray-200 px-3 py-2.5 text-[11px] dark:border-gray-700" data-agent-dev-result="">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400" name="code" />
        <span className="min-w-0 truncate font-mono text-xs text-gray-900 dark:text-gray-100">{result.branch}</span>
        {repo ? <span className="shrink-0 text-gray-500 dark:text-gray-400">{repo}</span> : null}
        {review ? (
          <span
            className={`${CHIP_CLASS} ml-auto ${review.pushed ? 'bg-green-600/[0.12] text-green-800 dark:text-green-300' : 'bg-gray-500/[0.12] text-gray-600 dark:text-gray-300'}`}
          >
            {review.pushed ? t('agentSession.resultPushed') : t('agentSession.resultNotPushed')}
          </span>
        ) : null}
      </div>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <span className={`inline-flex items-center gap-1 font-medium ${TESTS_CLASS[result.tests]}`}>
          <Icon className="h-3 w-3" name={TESTS_ICON[result.tests]} />
          {t(`agentSession.resultTests.${result.tests}`)}
        </span>
        {review && review.uncommitted > 0 ? (
          <span className="text-amber-700 dark:text-amber-300">{t('agentSession.resultUncommitted', { count: review.uncommitted })}</span>
        ) : null}
        {!review && result.filesChanged != null ? (
          <span className="text-gray-500 dark:text-gray-400">
            {t('agentSession.resultDiff', {
              deletions: result.deletions ?? 0,
              files: result.filesChanged,
              insertions: result.insertions ?? 0,
            })}
          </span>
        ) : null}
      </p>

      {review && workspace?.worktree && sessionId ? (
        <AgentDevResultFiles files={review.files} sessionId={sessionId} worktree={workspace.worktree} />
      ) : null}

      {commits.length > 0 ? (
        <details className="px-1">
          <summary className="cursor-pointer text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            {t('agentSession.resultCommits', { count: commits.length })}
          </summary>
          <ul className="mt-1 space-y-0.5">
            {commits.map((commit) => (
              <li key={commit.sha} className="flex gap-2">
                <span className="shrink-0 font-mono text-gray-500 dark:text-gray-400">{commit.sha.slice(0, 7)}</span>
                <span className="min-w-0 truncate text-gray-800 dark:text-gray-200">{commit.subject}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <AgentDevOpenItems items={result.openItems} onAsk={onAsk} />

      {review && workspace?.worktree ? (
        <AgentDevResultActions pushing={pushing} review={review} tests={result.tests} worktree={workspace.worktree} onPush={push} />
      ) : (
        <p className="text-gray-500 dark:text-gray-400">{t('agentSession.resultNoBridge')}</p>
      )}
    </div>
  );
}
