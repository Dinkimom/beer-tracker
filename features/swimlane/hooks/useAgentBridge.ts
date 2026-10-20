'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { STORAGE_KEYS } from '@/hooks/localStorage/storageKeys';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  AGENT_BRIDGE_DEFAULT_URL,
  fetchAgentBridgeHealth,
  runAgentBridgeSession,
} from '@/lib/agentSessions/agentBridge';

const HEALTH_QUERY_KEY = ['agentBridge', 'health'] as const;

/**
 * Локальный мост к Claude CLI. Включается вручную: без этого планер не стучится на 127.0.0.1
 * (браузер может спросить доступ к локальной сети). Опрос — только пока вкладка активна.
 */
export function useAgentBridge() {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useLocalStorage(STORAGE_KEYS.AGENT_BRIDGE_ENABLED, false);
  const health = useQuery({
    enabled,
    queryFn: () => fetchAgentBridgeHealth(AGENT_BRIDGE_DEFAULT_URL),
    queryKey: HEALTH_QUERY_KEY,
    refetchInterval: (query) => (query.state.data?.running.length ? 3000 : 30_000),
    refetchIntervalInBackground: false,
    retry: false,
  });
  const data = enabled ? health.data : null;

  const run = async (sessionId: string): Promise<boolean> => {
    const accepted = await runAgentBridgeSession(AGENT_BRIDGE_DEFAULT_URL, sessionId);
    await queryClient.invalidateQueries({ queryKey: HEALTH_QUERY_KEY });
    return accepted;
  };

  return {
    alive: data != null,
    /** Включён, но ответа /health ещё не было — «не отвечает» пока не показываем. */
    checking: enabled && health.isPending,
    enabled,
    run,
    running: data?.running ?? [],
    setEnabled,
  };
}
