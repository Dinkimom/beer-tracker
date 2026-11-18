'use client';

import type { AgentBridgeReview } from '@/lib/agentSessions/agentBridgeDev';
import type { AgentDevResult } from '@/lib/agentSessions/agentSessionKind';

import { useState } from 'react';

import { Button, buttonClassName } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

const SECONDARY_CLASS = buttonClassName({ size: 'sm', variant: 'secondary' });

const PRIMARY_CLASS = buttonClassName({ size: 'sm' });

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
          <Button
            data-agent-dev-push=""
            disabled={pushing || review.commits.length === 0}
            size="sm"
            variant={confirming ? 'warning' : 'primary'}
            onClick={push}
          >
            {confirming ? t('agentSession.resultPushConfirm') : t('agentSession.resultPush')}
            {confirming ? null : <Icon className="h-3.5 w-3.5" name="arrow-right" />}
          </Button>
        )}
      </div>
      {error ? <p className="text-[11px] text-red-600 dark:text-red-400">{t('agentSession.resultPushFailed', { error })}</p> : null}
    </div>
  );
}
