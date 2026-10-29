'use client';

import type { AgentBridgeReview } from '@/lib/agentSessions/agentBridgeDev';
import type { AgentDevResult } from '@/lib/agentSessions/agentSessionKind';

import { useState } from 'react';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

const ACTION_CLASS =
  'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60';

const SECONDARY_CLASS = `${ACTION_CLASS} bg-gray-500/[0.1] text-gray-800 hover:bg-gray-500/[0.18] active:bg-gray-500/[0.24] dark:bg-white/[0.08] dark:text-gray-100 dark:hover:bg-white/[0.14] dark:active:bg-white/[0.18]`;

const PRIMARY_CLASS = `${ACTION_CLASS} bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-500/80 dark:hover:bg-blue-500`;

const CONFIRM_CLASS = `${ACTION_CLASS} bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700`;

/**
 * Действия ревью: открыть рабочую копию в VS Code и «Запушить и открыть MR» — push делает мост
 * по клику человека (агенту push запрещён), затем открывается страница создания MR. Проверки
 * не прошли или не запускались — первый клик переспрашивает. Уже запушено — «Открыть MR».
 */
export function AgentDevResultActions({
  pushing,
  review,
  tests,
  worktree,
  onPush,
}: {
  pushing: boolean;
  review: AgentBridgeReview;
  tests: AgentDevResult['tests'];
  worktree: string;
  onPush: () => Promise<{ mergeRequestUrl: string | null } | null>;
}) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const push = () => {
    if (tests !== 'passed' && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setError('');
    onPush()
      .then((result) => {
        if (result?.mergeRequestUrl) {
          window.open(result.mergeRequestUrl, '_blank', 'noopener');
        }
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)));
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <a className={SECONDARY_CLASS} data-agent-dev-open-editor="" href={`vscode://file${encodeURI(worktree)}`}>
          <Icon className="h-3.5 w-3.5" name="code" />
          {t('agentSession.resultOpenEditor')}
        </a>
        {review.pushed && review.mergeRequestUrl ? (
          <a className={PRIMARY_CLASS} data-agent-dev-open-mr="" href={review.mergeRequestUrl} rel="noopener noreferrer" target="_blank">
            {t('agentSession.resultOpenMr')}
            <Icon className="h-3.5 w-3.5" name="arrow-right" />
          </a>
        ) : (
          <button
            className={confirming ? CONFIRM_CLASS : PRIMARY_CLASS}
            data-agent-dev-push=""
            disabled={pushing || review.commits.length === 0}
            type="button"
            onClick={push}
          >
            {confirming ? t('agentSession.resultPushConfirm') : t('agentSession.resultPush')}
            {confirming ? null : <Icon className="h-3.5 w-3.5" name="arrow-right" />}
          </button>
        )}
      </div>
      {error ? <p className="text-[11px] text-red-600 dark:text-red-400">{t('agentSession.resultPushFailed', { error })}</p> : null}
    </div>
  );
}
