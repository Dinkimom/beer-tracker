'use client';

import type { AgentBridgeStep } from '@/lib/agentSessions/agentBridge';

import { useEffect, useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Текст пузыря «Ждёт агента», пока агент работает: что он делает сейчас и сколько уже идёт.
 * Шаг — из потока Claude CLI через мост или, для внешнего агента, по его последнему вызову MCP.
 * Таймер тикает сам — шаг обновляется опросом моста или realtime сессий.
 */
export function AgentBridgeProgress({ startedAt, step }: { startedAt: number; step: AgentBridgeStep }) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className="inline-flex min-w-0 items-center gap-1" data-agent-bridge-progress={step} role="status">
      <span className="min-w-0 truncate">{t(`agentSession.bridgeStep.${step}`)}</span>
      <span className="shrink-0 tabular-nums opacity-60">{formatElapsed(now - startedAt)}</span>
    </span>
  );
}
