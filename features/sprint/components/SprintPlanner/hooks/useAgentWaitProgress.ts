'use client';

import type { AgentBridgeStep } from '@/lib/agentSessions/agentBridge';
import type { AgentSession } from '@/lib/agentSessions/agentSession';

import { useEffect, useState } from 'react';

import { agentWaitState } from '@/lib/agentSessions/agentActivity';

/** Как часто пересчитывать «работает» → «затих»: порог — минуты, секундная точность не нужна. */
const RECHECK_MS = 15_000;

/** Агент работает: шаг и с какого момента ждём ответ; у моста — ещё команда и процент клонирования. */
interface AgentRunProgress {
  detail?: string;
  percent?: number;
  startedAt: number;
  step: AgentBridgeStep;
}

interface AgentWaitProgress {
  progress: AgentRunProgress | null;
  /** Агент забрал просьбу и давно затих — на каком шаге. */
  silentStep?: AgentBridgeStep;
}

/**
 * Что с ответом агента, пока сессия его ждёт. Запуск через мост к Claude CLI видно по его потоку;
 * внешний агент (claude.ai, Cursor…) — по последнему вызову MCP. Нет ни того ни другого — его надо позвать.
 */
export function useAgentWaitProgress(
  session: AgentSession | null,
  bridgeRun: AgentRunProgress | undefined
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
    const { detail, percent, startedAt, step } = bridgeRun;
    return { progress: { detail, percent, startedAt, step } };
  }
  const wait = session && waiting ? agentWaitState(session, now) : null;
  if (wait?.kind === 'working') {
    return { progress: { startedAt: wait.since, step: wait.step } };
  }
  return wait?.kind === 'silent' ? { progress: null, silentStep: wait.step } : { progress: null };
}
