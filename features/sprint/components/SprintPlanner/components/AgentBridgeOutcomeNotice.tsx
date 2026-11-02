'use client';

import type { AgentBridgeFinishedRun } from '@/lib/agentSessions/agentBridge';

import { useI18n } from '@/contexts/LanguageContext';

const CLONE_FAILED = 'clone_failed:';

/**
 * Прогон в мосте кончился, а агент так и не ответил в чат: ошибка запуска (таймаут, CLI упал, нет
 * рабочей копии) или агент закончил молча — тогда его последние слова из CLI. Под плашкой остаётся
 * «Запустить агента»: поправить причину и запустить снова.
 */
export function AgentBridgeOutcomeNotice({ run }: { run: AgentBridgeFinishedRun }) {
  const { t } = useI18n();
  const text = run.text.trim();
  const clone = run.error?.startsWith(CLONE_FAILED) ? run.error.slice(CLONE_FAILED.length).trim() : null;
  let errorText: string | null = null;
  if (clone != null) {
    errorText = t('agentSession.bridgeCloneFailed', { error: clone });
  } else if (run.error) {
    errorText = t('agentSession.bridgeFailed', { error: run.error });
  }
  return (
    <div
      className="space-y-1 rounded-lg bg-red-50 px-2.5 py-2 text-[11px] text-red-900 dark:bg-red-500/10 dark:text-red-200"
      data-agent-bridge-outcome={run.error ? 'failed' : 'silent'}
      role="status"
    >
      <p className="font-medium">
        {errorText ?? t('agentSession.bridgeSilent')}
      </p>
      {text ? <p className="line-clamp-4 whitespace-pre-line text-red-800/90 dark:text-red-200/80">{text}</p> : null}
    </div>
  );
}
