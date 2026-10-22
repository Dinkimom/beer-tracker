'use client';

import type { AgentBridgeStep } from '@/lib/agentSessions/agentBridge';
import type { AgentSession } from '@/lib/agentSessions/agentSession';

import { useEffect, useState } from 'react';

import { agentWaitState } from '@/lib/agentSessions/agentActivity';

/** Как часто пересчитывать «работает» → «затих»: порог — минуты, секундная точность не нужна. */
const RECHECK_MS = 15_000;

interface AgentWaitProgress {
  /** Агент работает: шаг и с какого момента ждём ответ. */
  progress: { startedAt: number; step: AgentBridgeStep } | null;
  /** Агент забрал просьбу и давно затих — на каком шаге. */
  silentStep?: AgentBridgeStep;
}

/**
 * Что с ответом агента, пока сессия его ждёт. Запуск через мост к Claude CLI видно по его потоку;
 * внешний агент (claude.ai, Cursor…) — по последнему вызову MCP. Нет ни того ни другого — его надо позвать.
 */
export function useAgentWaitProgress(
  session: AgentSession | null,
  bridgeRun: { startedAt: number; step: AgentBridgeStep } | undefined
): AgentWaitProgress {
  const waiting = session?.status === 'waiting_agent';
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!waiting) {
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), RECHECK_MS);
    return () => window.clearInterval(timer);
  }, [waiting]);

  if (bridgeRun) {
    return { progress: { startedAt: bridgeRun.startedAt, step: bridgeRun.step } };
  }
  const wait = session && waiting ? agentWaitState(session, now) : null;
  if (wait?.kind === 'working') {
    return { progress: { startedAt: wait.since, step: wait.step } };
  }
  return wait?.kind === 'silent' ? { progress: null, silentStep: wait.step } : { progress: null };
}
