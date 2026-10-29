'use client';

import type { AgentTaskCandidate } from '@/lib/agentSessions/agentSkills';

import { useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { useAgentDevTasks } from '@/features/task/components/TaskCard/AgentDevTasksContext';

/**
 * Ответ скилла «Что отдать агенту»: задачи спринта, которые агент может сделать сам, с причиной.
 * Галочки — что отдать (уже отданные агенту помечены его состоянием, их не выбрать); «Отдать
 * выбранные» создаёт по сессии разработки на задачу — мост запускает их параллельно, сверх лимита
 * ставит в очередь.
 */
export function AgentTaskCandidates({
  candidates,
  onHandOff,
}: {
  candidates: readonly AgentTaskCandidate[];
  /** Отдать задачи агенту; нет — сессия не принимает действий (закрыта). */
  onHandOff?: (candidates: readonly AgentTaskCandidate[]) => Promise<void>;
}) {
  const { t } = useI18n();
  const taken = useAgentDevTasks();
  const free = candidates.filter((candidate) => {
    const state = taken.get(candidate.taskKey)?.state;
    return !state || state === 'candidate';
  });
  const [unchecked, setUnchecked] = useState<ReadonlySet<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const selected = free.filter((candidate) => !unchecked.has(candidate.taskKey));

  const toggle = (taskKey: string) =>
    setUnchecked((prev) => {
      const next = new Set(prev);
      if (!next.delete(taskKey)) {
        next.add(taskKey);
      }
      return next;
    });

  const handOff = () => {
    if (!onHandOff || selected.length === 0) {
      return;
    }
    setBusy(true);
    onHandOff(selected).finally(() => setBusy(false));
  };

  return (
    <div className="mt-2 w-full space-y-1 rounded-lg border border-gray-200 p-1.5 dark:border-gray-700" data-agent-task-candidates="">
      {candidates.map((candidate) => {
        const state = taken.get(candidate.taskKey)?.state;
        const handed = state != null && state !== 'candidate';
        return (
          <label
            key={candidate.taskKey}
            className={`flex items-start gap-2 rounded-md px-1.5 py-1 text-[11px] transition-colors ${handed ? 'opacity-70' : 'cursor-pointer hover:bg-gray-500/[0.06] dark:hover:bg-white/[0.04]'}`}
          >
            <input
              checked={handed || !unchecked.has(candidate.taskKey)}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer rounded accent-blue-500 disabled:cursor-default"
              disabled={handed || !onHandOff}
              type="checkbox"
              onChange={() => toggle(candidate.taskKey)}
            />
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className="shrink-0 font-mono text-gray-500 dark:text-gray-400">{candidate.taskKey}</span>
                <span className="truncate font-medium text-gray-900 dark:text-gray-100">{candidate.summary}</span>
              </span>
              <span className="block text-gray-500 dark:text-gray-400">{candidate.reason}</span>
            </span>
            {handed ? (
              <span className="shrink-0 rounded-full bg-gray-500/[0.12] px-1.5 text-[10px] font-medium leading-4 text-gray-600 dark:bg-white/[0.1] dark:text-gray-300">
                {t(`agentSession.devState.${state}`)}
              </span>
            ) : null}
          </label>
        );
      })}
      {onHandOff && free.length > 0 ? (
        <div className="px-1.5 pb-0.5 pt-1">
          <button
            className="inline-flex h-7 cursor-pointer items-center rounded-lg bg-blue-600 px-2.5 text-xs font-medium text-white transition-all duration-200 hover:bg-blue-700 active:scale-[0.98] active:bg-blue-800 disabled:pointer-events-none disabled:opacity-60 dark:bg-blue-500/80 dark:hover:bg-blue-500"
            data-agent-task-candidates-handoff=""
            disabled={busy || selected.length === 0}
            type="button"
            onClick={handOff}
          >
            {t('agentSession.candidatesHandOff', { count: selected.length })}
          </button>
        </div>
      ) : null}
    </div>
  );
}
