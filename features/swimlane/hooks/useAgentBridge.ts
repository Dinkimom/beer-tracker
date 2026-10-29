'use client';

import type { AgentBridgeFinishedRun } from '@/lib/agentSessions/agentBridge';
import type { AgentBridgeRunTarget } from '@/lib/agentSessions/agentBridgeDev';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { STORAGE_KEYS } from '@/hooks/localStorage/storageKeys';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  AGENT_BRIDGE_DEFAULT_URL,
  fetchAgentBridgeHealth,
  fetchAgentBridgeRepos,
  fetchAgentBridgeWorkspace,
  pushAgentBridgeBranch,
  runAgentBridgeSession,
  saveAgentBridgeRepos,
} from '@/lib/agentSessions/agentBridge';

const HEALTH_QUERY_KEY = ['agentBridge', 'health'] as const;

/** Запуски, отправленные в мост, но ещё не попавшие в /health: сессия → время отправки. */
const STARTING_QUERY_KEY = ['agentBridge', 'starting'] as const;

type StartingRuns = Readonly<Record<string, number>>;

const NO_STARTING: StartingRuns = {};

const NO_QUEUES: readonly string[] = [];

const NO_FINISHED: readonly AgentBridgeFinishedRun[] = [];

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
  const run = async (target: AgentBridgeRunTarget): Promise<boolean> => {
    const { sessionId } = target;
    const setStarting = (update: (prev: StartingRuns) => StartingRuns) =>
      queryClient.setQueryData<StartingRuns>(STARTING_QUERY_KEY, (prev) => update(prev ?? NO_STARTING));
    setStarting((prev) => ({ ...prev, [sessionId]: Date.now() }));
    try {
      const accepted = await runAgentBridgeSession(AGENT_BRIDGE_DEFAULT_URL, target);
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
    /** Очереди, для задач которых у моста есть репозиторий: их сессии разработки он запускает сам. */
    devQueues: data?.devQueues ?? NO_QUEUES,
    /** Чем кончились последние прогоны по сессиям: по ним видно, что агент не ответил в чат. */
    finished: data?.finished ?? NO_FINISHED,
    enabled,
    run,
    /** Идущие запуски (и только что отправленные): сессия, шаг агента, время старта. */
    runs: enabled && pending.length > 0 ? [...runs, ...pending] : runs,
    setEnabled,
  };
}

const REPOS_QUERY_KEY = ['agentBridge', 'repos'] as const;

/**
 * Репозитории для сессий разработки в настройках моста (Настройки → Агент). Пока какой-то ждёт
 * подтверждения в терминале моста, список опрашивается — статус сменится сам.
 */
export function useAgentBridgeRepos(alive: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    enabled: alive,
    queryFn: () => fetchAgentBridgeRepos(AGENT_BRIDGE_DEFAULT_URL),
    queryKey: REPOS_QUERY_KEY,
    refetchInterval: (state) => (state.state.data?.repos.some((repo) => repo.status === 'pending') ? 2000 : false),
    retry: false,
  });
  const save = useMutation({
    mutationFn: (repos: ReadonlyArray<{ checks: string[]; path: string; queues: string[] }>) =>
      saveAgentBridgeRepos(AGENT_BRIDGE_DEFAULT_URL, repos),
    onSuccess: (data) => {
      queryClient.setQueryData(REPOS_QUERY_KEY, data);
      queryClient.invalidateQueries({ queryKey: HEALTH_QUERY_KEY }).catch(() => undefined);
    },
  });
  return { data: query.data ?? null, save: save.mutateAsync, saving: save.isPending };
}

/**
 * Рабочая копия сессии разработки у моста и её живое состояние в git — для ревью в карточке
 * результата; `push` — запушить ветку (по клику человека) и вернуть ссылку на создание MR.
 * Пока агент работает, состояние обновляется вместе с опросом моста.
 */
export function useAgentBridgeWorkspace(sessionId: string | null) {
  const bridge = useAgentBridge();
  const queryClient = useQueryClient();
  const queryKey = ['agentBridge', 'workspace', sessionId] as const;
  const working = bridge.runs.some((run) => run.sessionId === sessionId);
  const query = useQuery({
    enabled: bridge.alive && sessionId != null,
    queryFn: () => (sessionId ? fetchAgentBridgeWorkspace(AGENT_BRIDGE_DEFAULT_URL, sessionId) : null),
    queryKey,
    refetchInterval: working ? 5000 : false,
    retry: false,
  });
  const push = useMutation({
    mutationFn: () => (sessionId ? pushAgentBridgeBranch(AGENT_BRIDGE_DEFAULT_URL, sessionId) : Promise.resolve(null)),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
  return { push: push.mutateAsync, pushing: push.isPending, workspace: query.data ?? null };
}

