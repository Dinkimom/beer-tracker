import type { AgentSessionMessage } from '@/lib/agentSessions/agentSession';

import {
  type AgentBridgeStep,
  agentStepForTool,
  isAgentSessionId,
} from '@/lib/agentSessions/agentBridge';

/**
 * Что делает внешний агент (claude.ai, Cursor…) над сессией — по его вызовам тулов MCP.
 * Мост к Claude CLI видит поток модели целиком; здесь — только тулы, зато для любого клиента.
 */
export interface AgentSessionActivity {
  /** Последний вызов тула (ISO). */
  at: string;
  step: AgentBridgeStep;
}

/** Вызов тула MCP: какой шаг и к какой сессии или спринту он относится (если видно из аргументов). */
interface AgentMcpToolCall {
  sessionId: string | null;
  sprintId: number | null;
  step: AgentBridgeStep;
}

function toolCallFromMessage(message: unknown): AgentMcpToolCall | null {
  const record = message as { method?: unknown; params?: { arguments?: unknown; name?: unknown } } | null;
  if (record?.method !== 'tools/call' || typeof record.params?.name !== 'string') {
    return null;
  }
  const args = (record.params.arguments ?? {}) as { sessionId?: unknown; sprintId?: unknown };
  const sprintId = Number.isInteger(args.sprintId) && (args.sprintId as number) > 0 ? (args.sprintId as number) : null;
  return {
    sessionId: isAgentSessionId(args.sessionId) ? args.sessionId : null,
    sprintId,
    step: agentStepForTool(record.params.name),
  };
}

/** Вызовы тулов из тела JSON-RPC запроса к /api/mcp (одно сообщение или пачка). */
export function agentMcpToolCallsFromBody(body: unknown): AgentMcpToolCall[] {
  const messages: unknown[] = Array.isArray(body) ? body : [body];
  return messages.flatMap((message) => {
    const call = toolCallFromMessage(message);
    return call ? [call] : [];
  });
}

/** Агент вызывал MCP не дольше этого назад — считаем, что он ещё работает над ответом. */
export const AGENT_ACTIVITY_FRESH_MS = 3 * 60_000;

/**
 * Сессия ждёт агента: `unseen` — после последней реплики человека агент ничего не вызывал
 * (просьбу никто не забрал), `working` — вызывает тулы, `silent` — начал и давно затих.
 */
type AgentWaitState =
  | { kind: 'silent'; step: AgentBridgeStep }
  | { kind: 'unseen' }
  | { kind: 'working'; since: number; step: AgentBridgeStep };

function lastUserMessageAt(messages: readonly AgentSessionMessage[]): number | null {
  const last = messages.findLast((message) => message.authorKind === 'user');
  const at = last ? Date.parse(last.createdAt) : Number.NaN;
  return Number.isNaN(at) ? null : at;
}

export function agentWaitState(
  session: { agentActivity: AgentSessionActivity | null; messages: readonly AgentSessionMessage[] },
  now: number
): AgentWaitState {
  const asked = lastUserMessageAt(session.messages);
  const activity = session.agentActivity;
  const at = activity ? Date.parse(activity.at) : Number.NaN;
  if (!activity || Number.isNaN(at) || (asked != null && at < asked)) {
    return { kind: 'unseen' };
  }
  if (now - at > AGENT_ACTIVITY_FRESH_MS) {
    return { kind: 'silent', step: activity.step };
  }
  return { kind: 'working', since: asked ?? at, step: activity.step };
}
