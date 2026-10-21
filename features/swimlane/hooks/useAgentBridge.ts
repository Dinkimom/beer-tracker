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

/** Запуски, отправленные в мост, но ещё не попавшие в /health: сессия → время отправки. */
const STARTING_QUERY_KEY = ['agentBridge', 'starting'] as const;

type StartingRuns = Readonly<Record<string, number>>;

const NO_STARTING: StartingRuns = {};

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
    refetchInterval: (query) => (query.state.data?.runs.length ? 2000 : 30_000),
    refetchIntervalInBackground: false,
    retry: false,
  });
  const starting = useQuery({
    initialData: NO_STARTING,
    queryFn: () => NO_STARTING,
    queryKey: STARTING_QUERY_KEY,
    staleTime: Infinity,
  }).data;
  const data = enabled ? health.data : null;

  /**
   * Запуск виден сразу как «запускается», а не после ответа /run и следующего опроса /health:
   * иначе на эти доли секунды сессия выглядит ждущей без агента и мигает полоска «позови агента».
   */
  const run = async (sessionId: string): Promise<boolean> => {
    const setStarting = (update: (prev: StartingRuns) => StartingRuns) =>
      queryClient.setQueryData<StartingRuns>(STARTING_QUERY_KEY, (prev) => update(prev ?? NO_STARTING));
    setStarting((prev) => ({ ...prev, [sessionId]: Date.now() }));
    try {
      const accepted = await runAgentBridgeSession(AGENT_BRIDGE_DEFAULT_URL, sessionId);
      await queryClient.invalidateQueries({ queryKey: HEALTH_QUERY_KEY });
      return accepted;
    } finally {
      setStarting((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== sessionId)));
    }
  };

  const runs = data?.runs ?? [];
  const pending = Object.entries(starting)
    .filter(([sessionId]) => !runs.some((item) => item.sessionId === sessionId))
    .map(([sessionId, startedAt]) => ({ sessionId, startedAt, step: 'starting' as const }));

  return {
    alive: data != null,
    /** Включён, но ответа /health ещё не было — «не отвечает» пока не показываем. */
    checking: enabled && health.isPending,
    enabled,
    run,
    /** Идущие запуски (и только что отправленные): сессия, шаг агента, время старта. */
    runs: enabled && pending.length > 0 ? [...runs, ...pending] : runs,
    setEnabled,
  };
}
