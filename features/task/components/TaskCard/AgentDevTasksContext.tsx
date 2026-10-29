'use client';

import type { AgentDevTask } from '@/lib/agentSessions/agentDevState';

import { createContext, useContext, useMemo } from 'react';

import { useAgentBridge } from '@/features/swimlane/hooks/useAgentBridge';
import { useAgentSessions } from '@/features/swimlane/hooks/useAgentSessions';
import { agentDevTasks } from '@/lib/agentSessions/agentDevState';

const AgentDevTasksContext = createContext<ReadonlyMap<string, AgentDevTask>>(new Map());

/** Какими задачами доски занимается агент — считается один раз на доску, карточки только читают. */
export function AgentDevTasksProvider({ children, sprintId }: { children: React.ReactNode; sprintId: number | null }) {
  const { sessions } = useAgentSessions(sprintId);
  const { runs } = useAgentBridge();
  const runningKey = runs.map((run) => run.sessionId).sort().join(',');
  const value = useMemo(
    () => agentDevTasks(sessions, new Set(runningKey ? runningKey.split(',') : [])),
    [runningKey, sessions]
  );
  return <AgentDevTasksContext.Provider value={value}>{children}</AgentDevTasksContext.Provider>;
}

/** Все задачи доски, которыми занимается агент или которые он предложил отдать ему. */
export function useAgentDevTasks(): ReadonlyMap<string, AgentDevTask> {
  return useContext(AgentDevTasksContext);
}

/** Сессия агента по задаче (ключ трекера) и её состояние; null — агент задачей не занимается. */
export function useAgentDevTask(taskKey: string | null): AgentDevTask | null {
  const tasks = useContext(AgentDevTasksContext);
  return taskKey ? (tasks.get(taskKey) ?? null) : null;
}
