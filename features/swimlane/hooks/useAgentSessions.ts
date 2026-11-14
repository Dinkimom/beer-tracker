'use client';

import type {
  AgentSession,
  AgentSessionCreatePayload,
  AgentSessionUserMessagePayload,
} from '@/lib/agentSessions/agentSession';
import type { AgentSessionScope } from '@/lib/agentSessions/agentSessionScope';
import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { agentBridgeRunTarget } from '@/lib/agentSessions/agentBridgeDev';
import {
  countOpenAgentSessionComments,
  groupAgentSessionItemComments,
} from '@/lib/agentSessions/agentSession';
import { agentSessionScopeKey, sprintScope } from '@/lib/agentSessions/agentSessionScope';
import {
  createAgentSession,
  fetchAgentSessions,
  postAgentSessionMessage,
  setAgentSessionStatus,
  type SprintAgentSessions,
  withdrawAgentSessionMessage,
} from '@/lib/api/agentSessions';

import { useAgentBridge } from './useAgentBridge';

/** Ключ для инвалидации из realtime (`agentSessions`). */
export const AGENT_SESSIONS_QUERY_KEY = 'agentSessions';

const EMPTY: SprintAgentSessions = { agentAvailable: false, agentBrand: null, draftSessionId: null, sessions: [] };

function upsertSession(data: SprintAgentSessions | undefined, session: AgentSession): SprintAgentSessions {
  const rest = (data?.sessions ?? []).filter((item) => item.id !== session.id);
  return { ...(data ?? EMPTY), sessions: [session, ...rest] };
}

/** Сессии спринта (номер) или квартального плана (`AgentSessionScope`). */
type AgentSessionsTarget = AgentSessionScope | number | null | undefined;

function toScope(target: AgentSessionsTarget): AgentSessionScope | null {
  if (target == null) return null;
  return typeof target === 'number' ? sprintScope(target) : target;
}

/** У квартала своего realtime-канала нет: его сессии перечитываем сами, пока доска открыта (QM11). */
const QUARTER_POLL_MS = 5000;

function useAgentSessionsQueryKey(scope: AgentSessionScope | null) {
  const forDemoPlanner = useDemoPlannerBoardsQueryScope();
  // Сессии спринта — по номеру, как раньше: realtime инвалидирует `[agentSessions, sprintId]`.
  const key = scope?.kind === 'sprint' ? scope.sprintId : scope ? agentSessionScopeKey(scope) : null;
  return useMemo(
    () =>
      forDemoPlanner ? ([AGENT_SESSIONS_QUERY_KEY, 'demo', key] as const) : ([AGENT_SESSIONS_QUERY_KEY, key] as const),
    [forDemoPlanner, key]
  );
}

function useSprintAgentSessionsQuery(target: AgentSessionsTarget) {
  const scope = toScope(target);
  const queryKey = useAgentSessionsQueryKey(scope);
  const query = useQuery({
    enabled: scope != null,
    queryFn: () => (scope == null ? EMPTY : fetchAgentSessions(scope)),
    queryKey,
    refetchInterval: scope?.kind === 'quarter' ? QUARTER_POLL_MS : false,
    staleTime: 1000 * 60,
  });
  return { data: query.data ?? EMPTY, loaded: query.isSuccess, queryKey, scope };
}

/** Показывать ли «Агенту»: без агента просьба из планера никуда не уйдёт. */
export function useAgentAvailable(target: AgentSessionsTarget): boolean {
  return useSprintAgentSessionsQuery(target).data.agentAvailable;
}

/**
 * Кто ответит на просьбу: мост на связи — Claude CLI, иначе клиент подключённого MCP.
 * null — агента нет или клиент не опознан.
 */
export function useAgentBrand(target: AgentSessionsTarget): McpOAuthClientBrand | null {
  const { agentBrand } = useSprintAgentSessionsQuery(target).data;
  const bridge = useAgentBridge();
  if (bridge.alive) {
    return 'claude';
  }
  return agentBrand === 'generic' ? null : agentBrand;
}

/**
 * Свои сессии с агентом в спринте. Открытых может быть сколько угодно, и агенты работают над ними
 * параллельно. Драфт на доске один (`draftSession`): к его пунктам относятся 💬 и их счётчик.
 */
export function useAgentSessions(target: AgentSessionsTarget) {
  const queryClient = useQueryClient();
  const { data, loaded, queryKey, scope } = useSprintAgentSessionsQuery(target);
  const bridge = useAgentBridge();
  const { draftSessionId, sessions } = data;
  const draftSession = useMemo(
    () => sessions.find((session) => session.id === draftSessionId) ?? null,
    [draftSessionId, sessions]
  );
  const openSessions = useMemo(
    () =>
      sessions
        .filter((session) => session.status !== 'closed')
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [sessions]
  );

  const store = (session: AgentSession | null) => {
    if (!session) {
      return;
    }
    queryClient.setQueryData<SprintAgentSessions>(queryKey, (prev) => upsertSession(prev, session));
    // Просьба или «переделать» — сессия ждёт агента: при включённом мосте зовём его сразу.
    // Не ждём /health: если мост лежит, запуск просто не примут, а полоска покажет, что он не отвечает.
    // Сессию разработки — только если у моста есть репозиторий её очереди; иначе её заберёт агент в IDE.
    const target = agentBridgeRunTarget(session, bridge.dev);
    if (session.status === 'waiting_agent' && target && bridge.enabled) {
      bridge.run(target).catch(() => undefined);
    }
  };

  const create = useMutation({
    mutationFn: (input: AgentSessionCreatePayload) => {
      if (scope == null) {
        return Promise.reject(new Error('sprint is not selected'));
      }
      return createAgentSession(scope, input);
    },
    onSuccess: store,
  });

  const post = useMutation({
    mutationFn: ({ sessionId, ...input }: AgentSessionUserMessagePayload & { sessionId: string }) =>
      postAgentSessionMessage(sessionId, input),
    onSuccess: store,
  });

  /** Отозвать свой 💬 к пункту драфта. */
  const withdraw = useMutation({
    mutationFn: async (messageId: string) => {
      if (!draftSession) {
        return;
      }
      await withdrawAgentSessionMessage(draftSession.id, messageId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const close = useMutation({
    mutationFn: (sessionId: string) => setAgentSessionStatus(sessionId, 'closed'),
    onSuccess: store,
  });

  const derived = useMemo(
    () => ({
      itemComments: groupAgentSessionItemComments(draftSession?.messages ?? []),
      openComments: countOpenAgentSessionComments(draftSession?.messages ?? []),
    }),
    [draftSession]
  );

  return {
    ...derived,
    close: close.mutateAsync,
    create: create.mutateAsync,
    creating: create.isPending,
    /** Сессия, чей драфт сейчас висит на доске; другие сессии ждут, пока его разберут. */
    draftSession,
    /** Сессии спринта уже пришли с сервера (до этого — пустой список-заглушка). */
    loaded,
    /** Незакрытые сессии, свежие сверху. */
    openSessions,
    post: post.mutateAsync,
    posting: post.isPending,
    sessions,
    withdraw: withdraw.mutateAsync,
  };
}
