import type { AgentSession } from '@/lib/agentSessions/agentSession';

/**
 * Где работа по сессии разработки: агент работает (в мосте), прислал ветку на ревью, ждёт ответа
 * человека, ждёт агента, сессия закрыта. Одно правило для строки под заголовком чата и значка на доске.
 * `candidate` — задачу агент предложил отдать ему («Что отдать агенту»), но её ещё не отдали.
 */
export type AgentDevState = 'candidate' | 'closed' | 'review' | 'waitingAgent' | 'waitingUser' | 'working';

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
 * Несколько сессий по одной задаче — берём самую свежую. Задачи, которые агент предложил отдать ему
 * в последнем ответе скилла открытой сессии и которые ещё не отданы, — `candidate` (сессия — та,
 * где предложение: клик по значку открывает его).
 */
export function agentDevTasks(
  sessions: readonly AgentSession[],
  runningSessionIds: ReadonlySet<string>
): Map<string, AgentDevTask> {
  const tasks = latestDevSessions(sessions, runningSessionIds);
  for (const session of sessions) {
    for (const taskKey of offeredTaskKeys(session)) {
      if (!tasks.has(taskKey)) {
        tasks.set(taskKey, { sessionId: session.id, state: 'candidate' });
      }
    }
  }
  return tasks;
}

/** Последняя открытая сессия разработки по каждой задаче. */
function latestDevSessions(sessions: readonly AgentSession[], runningSessionIds: ReadonlySet<string>): Map<string, AgentDevTask> {
  const latest = new Map<string, AgentSession>();
  for (const session of sessions) {
    if (session.kind !== 'dev' || session.status === 'closed' || !session.taskId) {
      continue;
    }
    const current = latest.get(session.taskId);
    if (!current || current.updatedAt < session.updatedAt) {
      latest.set(session.taskId, session);
    }
  }
  return new Map(
    [...latest].map(([taskKey, session]) => [
      taskKey,
      { sessionId: session.id, state: agentDevState(session, runningSessionIds.has(session.id)) },
    ])
  );
}

/** Задачи из последнего ответа «Что отдать агенту» в открытой сессии. */
function offeredTaskKeys(session: AgentSession): string[] {
  if (session.status === 'closed') {
    return [];
  }
  const offer = session.messages.findLast((message) => message.candidates?.length);
  return offer?.candidates?.map((candidate) => candidate.taskKey) ?? [];
}
