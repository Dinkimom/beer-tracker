import type {
  AgentSession,
  AgentSessionCreatePayload,
  AgentSessionUserMessagePayload,
} from '@/lib/agentSessions/agentSession';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

export interface SprintAgentSessions {
  /** Есть ли агент, который заберёт просьбу (сейчас — подключён MCP); без него «Агенту» не показываем. */
  agentAvailable: boolean;
  /** Сессия, в которой лежит текущий драфт пользователя в спринте. */
  draftSessionId: string | null;
  sessions: AgentSession[];
}

export async function fetchSprintAgentSessions(sprintId: number): Promise<SprintAgentSessions> {
  const { data }: { data: Partial<SprintAgentSessions> } = await getPlannerBeerTrackerApi().get(
    `/sprints/${sprintId}/agent-sessions`
  );
  return {
    agentAvailable: data.agentAvailable ?? false,
    draftSessionId: data.draftSessionId ?? null,
    sessions: data.sessions ?? [],
  };
}

export async function createSprintAgentSession(
  sprintId: number,
  input: AgentSessionCreatePayload
): Promise<AgentSession | null> {
  const { data }: { data: { session?: AgentSession } } = await getPlannerBeerTrackerApi().post(
    `/sprints/${sprintId}/agent-sessions`,
    input
  );
  return data.session ?? null;
}

export async function postAgentSessionMessage(
  sessionId: string,
  input: AgentSessionUserMessagePayload
): Promise<AgentSession | null> {
  const { data }: { data: { session?: AgentSession } } = await getPlannerBeerTrackerApi().post(
    `/agent-sessions/${sessionId}/messages`,
    input
  );
  return data.session ?? null;
}

export async function withdrawAgentSessionMessage(sessionId: string, messageId: string): Promise<void> {
  await getPlannerBeerTrackerApi().delete(`/agent-sessions/${sessionId}/messages`, {
    params: { id: messageId },
  });
}

export async function setAgentSessionStatus(
  sessionId: string,
  status: 'closed' | 'waiting_agent'
): Promise<AgentSession | null> {
  const { data }: { data: { session?: AgentSession } } = await getPlannerBeerTrackerApi().patch(
    `/agent-sessions/${sessionId}`,
    { status }
  );
  return data.session ?? null;
}
