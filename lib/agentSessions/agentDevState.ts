import type { AgentSession } from '@/lib/agentSessions/agentSession';

/**
 * Где работа по сессии разработки: агент работает (в мосте), прислал ветку на ревью, ждёт ответа
 * человека, ждёт агента, сессия закрыта. Одно правило для строки под заголовком чата и значка на доске.
 */
export type AgentDevState = 'closed' | 'review' | 'waitingAgent' | 'waitingUser' | 'working';

export function agentDevState(session: Pick<AgentSession, 'messages' | 'status'>, working: boolean): AgentDevState {
  if (session.status === 'closed') {
    return 'closed';
  }
  if (working) {
    return 'working';
  }
  if (session.status === 'waiting_agent') {
    return 'waitingAgent';
  }
  return session.messages.at(-1)?.kind === 'result' ? 'review' : 'waitingUser';
}

export interface AgentDevTask {
  sessionId: string;
  state: AgentDevState;
}

/**
 * Задачи, которыми занимается агент: ключ задачи → его открытая сессия разработки и её состояние.
 * Несколько сессий по одной задаче — берём самую свежую.
 */
export function agentDevTasks(
  sessions: readonly AgentSession[],
  runningSessionIds: ReadonlySet<string>
): Map<string, AgentDevTask> {
  const byTask = new Map<string, AgentDevTask & { updatedAt: string }>();
  for (const session of sessions) {
    if (session.kind !== 'dev' || session.status === 'closed' || !session.taskId) {
      continue;
    }
    const current = byTask.get(session.taskId);
    if (!current || current.updatedAt < session.updatedAt) {
      const state = agentDevState(session, runningSessionIds.has(session.id));
      byTask.set(session.taskId, { sessionId: session.id, state, updatedAt: session.updatedAt });
    }
  }
  return new Map([...byTask].map(([taskKey, { sessionId, state }]) => [taskKey, { sessionId, state }]));
}
