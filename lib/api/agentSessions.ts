import type {
  AgentSession,
  AgentSessionCreatePayload,
  AgentSessionUserMessagePayload,
} from '@/lib/agentSessions/agentSession';
import type { AgentSessionScope } from '@/lib/agentSessions/agentSessionScope';
import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';

import { sprintScope } from '@/lib/agentSessions/agentSessionScope';
import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

export interface SprintAgentSessions {
  /** Есть ли агент, который заберёт просьбу (сейчас — подключён MCP); без него «Агенту» не показываем. */
  agentAvailable: boolean;
  /** Каким клиентом MCP подключён агент (Claude, Cursor…); null — не подключён. */
  agentBrand: McpOAuthClientBrand | null;
  /** Сессия, в которой лежит текущий драфт пользователя в спринте. */
  draftSessionId: string | null;
  sessions: AgentSession[];
}

/** Путь сессий области: спринт или квартальный план. */
function agentSessionsPath(scope: AgentSessionScope): string {
  return scope.kind === 'sprint'
    ? `/sprints/${scope.sprintId}/agent-sessions`
    : `/quarterly-plans/agent-sessions?year=${scope.year}&quarter=${scope.quarter}`;
}

/** Свои сессии с агентом в спринте или квартале. */
export async function fetchAgentSessions(scope: AgentSessionScope): Promise<SprintAgentSessions> {
  const { data }: { data: Partial<SprintAgentSessions> } = await getPlannerBeerTrackerApi().get(agentSessionsPath(scope));
  return {
    agentAvailable: data.agentAvailable ?? false,
    agentBrand: data.agentBrand ?? null,
    draftSessionId: data.draftSessionId ?? null,
    sessions: data.sessions ?? [],
  };
}

export async function createAgentSession(
  scope: AgentSessionScope,
  input: AgentSessionCreatePayload
): Promise<AgentSession | null> {
  const { data }: { data: { session?: AgentSession } } = await getPlannerBeerTrackerApi().post(
    agentSessionsPath(scope),
    input
  );
  return data.session ?? null;
}

export function fetchSprintAgentSessions(sprintId: number): Promise<SprintAgentSessions> {
  return fetchAgentSessions(sprintScope(sprintId));
}

export function createSprintAgentSession(sprintId: number, input: AgentSessionCreatePayload): Promise<AgentSession | null> {
  return createAgentSession(sprintScope(sprintId), input);
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
