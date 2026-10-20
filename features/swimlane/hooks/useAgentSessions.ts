'use client';

import type {
  AgentSession,
  AgentSessionCreatePayload,
  AgentSessionUserMessagePayload,
} from '@/lib/agentSessions/agentSession';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import {
  countOpenAgentSessionComments,
  groupAgentSessionItemComments,
} from '@/lib/agentSessions/agentSession';
import {
  createSprintAgentSession,
  fetchSprintAgentSessions,
  postAgentSessionMessage,
  setAgentSessionStatus,
  type SprintAgentSessions,
  withdrawAgentSessionMessage,
} from '@/lib/api/agentSessions';

import { useAgentBridge } from './useAgentBridge';

/** Ключ для инвалидации из realtime (`agentSessions`). */
export const AGENT_SESSIONS_QUERY_KEY = 'agentSessions';

const EMPTY: SprintAgentSessions = { agentAvailable: false, draftSessionId: null, sessions: [] };

function upsertSession(data: SprintAgentSessions | undefined, session: AgentSession): SprintAgentSessions {
  const rest = (data?.sessions ?? []).filter((item) => item.id !== session.id);
  return { ...(data ?? EMPTY), sessions: [session, ...rest] };
}

function useAgentSessionsQueryKey(sprintId: number | null | undefined) {
  const forDemoPlanner = useDemoPlannerBoardsQueryScope();
  return useMemo(
    () =>
      forDemoPlanner
        ? ([AGENT_SESSIONS_QUERY_KEY, 'demo', sprintId ?? null] as const)
        : ([AGENT_SESSIONS_QUERY_KEY, sprintId ?? null] as const),
    [forDemoPlanner, sprintId]
  );
}

function useSprintAgentSessionsQuery(sprintId: number | null | undefined) {
  const queryKey = useAgentSessionsQueryKey(sprintId);
  const query = useQuery({
    enabled: sprintId != null,
    queryFn: () => (sprintId == null ? EMPTY : fetchSprintAgentSessions(sprintId)),
    queryKey,
    staleTime: 1000 * 60,
  });
  return { data: query.data ?? EMPTY, queryKey };
}

/** Показывать ли «Агенту»: без агента просьба из планера никуда не уйдёт. */
export function useAgentAvailable(sprintId: number | null | undefined): boolean {
  return useSprintAgentSessionsQuery(sprintId).data.agentAvailable;
}

/**
 * Свои сессии с агентом в спринте. Активная — та, где лежит текущий драфт (туда пишут 💬
 * и «Попросить переделать»); если драфта нет — последняя незакрытая.
 */
export function useAgentSessions(sprintId: number | null | undefined) {
  const queryClient = useQueryClient();
  const { data, queryKey } = useSprintAgentSessionsQuery(sprintId);
  const bridge = useAgentBridge();
  const { draftSessionId, sessions } = data;
  const active = useMemo(
    () =>
      sessions.find((session) => session.id === draftSessionId) ??
      sessions.find((session) => session.status !== 'closed') ??
      null,
    [draftSessionId, sessions]
  );

  const store = (session: AgentSession | null) => {
    if (!session) {
      return;
    }
    queryClient.setQueryData<SprintAgentSessions>(queryKey, (prev) => upsertSession(prev, session));
    // Просьба или «переделать» — сессия ждёт агента: при включённом мосте зовём его сразу.
    // Не ждём /health: если мост лежит, запуск просто не примут, а полоска покажет, что он не отвечает.
    if (session.status === 'waiting_agent' && bridge.enabled) {
      bridge.run(session.id).catch(() => undefined);
    }
  };

  const create = useMutation({
    mutationFn: (input: AgentSessionCreatePayload) => {
      if (sprintId == null) {
        return Promise.reject(new Error('sprint is not selected'));
      }
      return createSprintAgentSession(sprintId, input);
    },
    onSuccess: store,
  });

  const post = useMutation({
    /** `sessionId` — в какую сессию; по умолчанию активная. */
    mutationFn: ({ sessionId, ...input }: AgentSessionUserMessagePayload & { sessionId?: string }) => {
      const target = sessionId ?? active?.id;
      if (!target) {
        return Promise.reject(new Error('no active agent session'));
      }
      return postAgentSessionMessage(target, input);
    },
    onSuccess: store,
  });

  const withdraw = useMutation({
    mutationFn: async (messageId: string) => {
      if (!active) {
        return;
      }
      await withdrawAgentSessionMessage(active.id, messageId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const close = useMutation({
    mutationFn: (sessionId?: string) => {
      const target = sessionId ?? active?.id;
      if (!target) {
        return Promise.resolve(null);
      }
      return setAgentSessionStatus(target, 'closed');
    },
    onSuccess: store,
  });

  const derived = useMemo(
    () => ({
      itemComments: groupAgentSessionItemComments(active?.messages ?? []),
      openComments: countOpenAgentSessionComments(active?.messages ?? []),
    }),
    [active]
  );

  return {
    ...derived,
    active,
    /** Сессия, чей драфт сейчас висит на доске: новые просьбы по умолчанию дописываются в неё. */
    draftSession: sessions.find((session) => session.id === draftSessionId) ?? null,
    close: close.mutateAsync,
    create: create.mutateAsync,
    creating: create.isPending,
    post: post.mutateAsync,
    posting: post.isPending,
    sessions,
    withdraw: withdraw.mutateAsync,
  };
}
