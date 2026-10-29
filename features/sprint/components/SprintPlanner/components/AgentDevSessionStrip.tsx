'use client';

import type { AgentDevState } from '@/lib/agentSessions/agentDevState';
import type { AgentSession } from '@/lib/agentSessions/agentSession';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { useAgentBridge, useAgentBridgeWorkspace } from '@/features/swimlane/hooks/useAgentBridge';
import { agentDevState } from '@/lib/agentSessions/agentDevState';

const STATE_CLASS: Record<AgentDevState, string> = {
  closed: 'bg-gray-500/[0.12] text-gray-600 dark:bg-white/[0.08] dark:text-gray-300',
  review: 'bg-green-600/[0.12] text-green-800 dark:bg-green-400/[0.15] dark:text-green-300',
  waitingAgent: 'bg-gray-500/[0.12] text-gray-600 dark:bg-white/[0.08] dark:text-gray-300',
  waitingUser: 'bg-blue-600/[0.12] text-blue-800 dark:bg-blue-400/[0.15] dark:text-blue-300',
  working: 'bg-amber-500/[0.15] text-amber-800 dark:bg-amber-400/[0.15] dark:text-amber-300',
};

/**
 * Строка под заголовком сессии разработки: задача, репозиторий и ветка (от моста, когда он по ней
 * работал) и состояние — чтобы видеть, где и что, не читая переписку. У остальных сессий и у новой
 * просьбы — ничего.
 */
export function AgentDevSessionStrip({ session }: { session: AgentSession | null }) {
  const { t } = useI18n();
  const bridge = useAgentBridge();
  const dev = session?.kind === 'dev' ? session : null;
  const { workspace } = useAgentBridgeWorkspace(dev?.id ?? null);
  if (!dev) {
    return null;
  }
  const state = agentDevState(dev, bridge.runs.some((run) => run.sessionId === dev.id));
  const repo = workspace?.repo.split('/').filter(Boolean).at(-1);
  const where = [dev.context.taskKey ?? dev.taskId, repo, workspace?.branch].filter(Boolean);

  return (
    <div className="-mt-1 flex min-w-0 items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400" data-agent-dev-strip={state}>
      <Icon className="h-3 w-3 shrink-0" name="code" />
      <span className="min-w-0 truncate font-mono">{where.join(' · ')}</span>
      <span className={`ml-auto shrink-0 rounded-full px-1.5 font-medium leading-4 ${STATE_CLASS[state]}`}>
        {t(`agentSession.devState.${state}`)}
      </span>
    </div>
  );
}
