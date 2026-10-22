import type {
  AgentSession,
  AgentSessionCreateInput,
  AgentSessionReply,
  AgentSessionUserMessageInput,
} from '@/lib/agentSessions/agentSession';
import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';

import {
  agentSessionDraftVersion,
  agentSessionTitleFromIntent,
  draftSessionConflict,
  statusAfterUserMessage,
} from '@/lib/agentSessions/agentSession';
import {
  createAgentSession,
  deleteOwnAgentSessionMessage,
  findAgentSessionByProposal,
  getAgentSession,
  insertAgentSessionMessage,
  listAgentSessions,
  setAgentSessionStatus,
} from '@/lib/agentSessions/agentSessionsRepository';
import { findActiveMcpOAuthClientMetadata } from '@/lib/mcp/oauth/mcpOAuthRepository';
import { resolveMcpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { loadPendingPlanPatchSnapshot } from '@/lib/sprints/sprintPlanPatchPending';

export class AgentSessionNotFoundError extends Error {
  constructor() {
    super('agent_session_not_found');
  }
}

function notifySession(organizationId: string, sprintId: number): void {
  notifySprintRealtime(new Request('http://localhost/api/agent-sessions'), organizationId, sprintId, [
    'agentSessions',
  ]);
}

async function requireSession(input: {
  organizationId: string;
  ownerId: string;
  sessionId: string;
}): Promise<AgentSession> {
  const session = await getAgentSession(input);
  if (!session) {
    throw new AgentSessionNotFoundError();
  }
  return session;
}

/** Сессия, которой принадлежит висящий драфт владельца в спринте (null — драфта нет или он без сессии). */
async function findDraftSessionId(input: {
  organizationId: string;
  ownerId: string;
  sprintId: number;
}): Promise<string | null> {
  const pending = await loadPendingPlanPatchSnapshot(input);
  return pending?.proposalId
    ? findAgentSessionByProposal({ ...input, proposalId: pending.proposalId })
    : null;
}

/** id сессий с висящим драфтом по спринтам — для пометки очереди во входящих агента. */
export async function draftSessionIdsBySprint(input: {
  organizationId: string;
  ownerId: string;
  sprintIds: readonly number[];
}): Promise<Map<number, string>> {
  const bySprint = new Map<number, string>();
  for (const sprintId of new Set(input.sprintIds)) {
    const sessionId = await findDraftSessionId({ ...input, sprintId });
    if (sessionId) {
      bySprint.set(sprintId, sessionId);
    }
  }
  return bySprint;
}

/** Свои сессии в спринте и id той, где лежит текущий драфт (туда идут 💬 к его пунктам). */
export async function listSprintAgentSessionsForOwner(input: {
  organizationId: string;
  ownerId: string;
  sprintId: number;
}): Promise<{
  agentAvailable: boolean;
  agentBrand: McpOAuthClientBrand | null;
  draftSessionId: string | null;
  sessions: AgentSession[];
}> {
  const [sessions, draftSessionId, agentBrand] = await Promise.all([
    listAgentSessions(input),
    findDraftSessionId(input),
    findAgentBrandForOwner(input),
  ]);
  return { agentAvailable: agentBrand != null, agentBrand, draftSessionId, sessions };
}

/**
 * Есть ли кому забрать просьбу из планера, и кто это (Claude, Cursor…). Пока агент только внешний —
 * через MCP, поэтому без подключённого MCP просьба повиснет в `waiting_agent`. Агенты по API
 * организации — сюда же.
 */
async function findAgentBrandForOwner(input: {
  organizationId: string;
  ownerId: string;
}): Promise<McpOAuthClientBrand | null> {
  const metadata = await findActiveMcpOAuthClientMetadata(input.organizationId, input.ownerId);
  if (!metadata) {
    return null;
  }
  const text = (value: unknown) => (typeof value === 'string' ? value : null);
  return resolveMcpOAuthClientBrand({ clientName: text(metadata.client_name), clientUri: text(metadata.client_uri) });
}

/** «Агенту» в планере: новая сессия с просьбой, ждёт агента. */
export async function createPlannerAgentSession(input: {
  organizationId: string;
  ownerId: string;
  request: AgentSessionCreateInput;
  sprintId: number;
}): Promise<AgentSession> {
  const sessionId = await createAgentSession({
    context: input.request.context,
    organizationId: input.organizationId,
    origin: 'planner',
    ownerId: input.ownerId,
    sprintId: input.sprintId,
    status: 'waiting_agent',
    taskId: input.request.taskId ?? null,
    title: agentSessionTitleFromIntent(input.request.title, input.request.text),
  });
  await insertAgentSessionMessage({
    authorId: input.ownerId,
    authorKind: 'user',
    kind: 'request',
    mentions: input.request.mentions,
    sessionId,
    skill: input.request.skill ?? null,
    text: input.request.text,
  });
  notifySession(input.organizationId, input.sprintId);
  return requireSession({ organizationId: input.organizationId, ownerId: input.ownerId, sessionId });
}

/** 💬 к пункту, «Попросить переделать» или реплика человека в своей сессии. */
export async function postUserAgentSessionMessage(input: {
  message: AgentSessionUserMessageInput;
  organizationId: string;
  ownerId: string;
  sessionId: string;
}): Promise<AgentSession> {
  const session = await requireSession(input);
  const pending = await loadPendingPlanPatchSnapshot({
    organizationId: input.organizationId,
    ownerId: input.ownerId,
    sprintId: session.sprintId,
  });
  await insertAgentSessionMessage({
    authorId: input.ownerId,
    authorKind: 'user',
    kind: input.message.kind,
    mentions: input.message.mentions,
    proposalId: pending?.proposalId ?? null,
    sessionId: session.id,
    skill: input.message.skill ?? null,
    target: input.message.target,
    text: input.message.text,
  });
  const next = statusAfterUserMessage(input.message.kind, session.status);
  if (next !== session.status) {
    await setAgentSessionStatus({ sessionId: session.id, status: next });
  }
  notifySession(input.organizationId, session.sprintId);
  return requireSession(input);
}

export async function withdrawUserAgentSessionMessage(input: {
  messageId: string;
  organizationId: string;
  ownerId: string;
  sessionId: string;
}): Promise<boolean> {
  const session = await requireSession(input);
  const deleted = await deleteOwnAgentSessionMessage({
    authorId: input.ownerId,
    messageId: input.messageId,
    sessionId: session.id,
  });
  if (deleted) {
    notifySession(input.organizationId, session.sprintId);
  }
  return deleted;
}

export async function setUserAgentSessionStatus(input: {
  organizationId: string;
  ownerId: string;
  sessionId: string;
  status: 'closed' | 'waiting_agent';
}): Promise<AgentSession> {
  const session = await requireSession(input);
  await setAgentSessionStatus({ sessionId: session.id, status: input.status });
  notifySession(input.organizationId, session.sprintId);
  return requireSession(input);
}

async function insertReplies(
  session: AgentSession,
  replies: readonly AgentSessionReply[],
  clientBrand: McpOAuthClientBrand | undefined
) {
  const sessionId = session.id;
  const commentIds = new Set(
    session.messages.filter((message) => message.kind === 'comment').map((message) => message.id)
  );
  let recorded = 0;
  for (const reply of replies) {
    const comment = session.messages.find((message) => message.id === reply.messageId);
    if (!comment || !commentIds.has(reply.messageId)) {
      continue;
    }
    await insertAgentSessionMessage({
      authorId: null,
      authorKind: 'agent',
      clientBrand,
      kind: 'reply',
      replyTo: reply.messageId,
      resolution: reply.resolution,
      sessionId,
      target: comment.target,
      text: reply.text,
    });
    recorded += 1;
  }
  return recorded;
}

/**
 * Сессия для нового драфта: явная `sessionId`, иначе та, где лежит текущий драфт владельца,
 * иначе новая (агент начал из чата). Чужая `sessionId` — ошибка. Вызывать до записи драфта:
 * после неё текущий proposal уже новый и прежнюю сессию по нему не найти.
 */
export async function prepareDraftAgentSession(input: {
  intent?: string;
  organizationId: string;
  ownerId: string;
  sessionId?: string;
  sprintId: number;
  summaryFallback: string;
}): Promise<AgentSession> {
  const existingId = await findDraftSessionId(input);
  if (input.sessionId) {
    const conflict = draftSessionConflict({ draftSessionId: existingId, requestedSessionId: input.sessionId });
    if (conflict) {
      throw new Error(conflict);
    }
    const session = await requireSession({
      organizationId: input.organizationId,
      ownerId: input.ownerId,
      sessionId: input.sessionId,
    });
    if (session.sprintId !== input.sprintId) {
      throw new Error(`session_sprint_mismatch: session ${session.id} is for sprint ${session.sprintId}`);
    }
    return session;
  }
  const sessionId =
    existingId ??
    (await createAgentSession({
      context: {},
      organizationId: input.organizationId,
      origin: 'agent',
      ownerId: input.ownerId,
      sprintId: input.sprintId,
      status: 'waiting_user',
      taskId: null,
      title: agentSessionTitleFromIntent(input.intent, input.summaryFallback),
    }));
  return requireSession({ organizationId: input.organizationId, ownerId: input.ownerId, sessionId });
}

/** После записи драфта: ответы на 💬, сообщение «драфт vN», сессия ждёт человека. */
export async function recordDraftInAgentSession(input: {
  clientBrand?: McpOAuthClientBrand;
  message?: string;
  organizationId: string;
  proposalId: string;
  replies: readonly AgentSessionReply[];
  session: AgentSession;
  summary: string;
}): Promise<{ draftVersion: number; repliesRecorded: number; sessionId: string }> {
  const repliesRecorded = await insertReplies(input.session, input.replies, input.clientBrand);
  await insertAgentSessionMessage({
    authorId: null,
    authorKind: 'agent',
    clientBrand: input.clientBrand,
    kind: 'draft',
    proposalId: input.proposalId,
    sessionId: input.session.id,
    text: input.message?.trim() || input.summary,
  });
  await setAgentSessionStatus({ sessionId: input.session.id, status: 'waiting_user' });
  notifySession(input.organizationId, input.session.sprintId);
  return {
    draftVersion: agentSessionDraftVersion(input.session.messages) + 1,
    repliesRecorded,
    sessionId: input.session.id,
  };
}

/** reply_agent_session: агент отвечает без нового драфта (уточнение, отказ, «готово»). */
export async function replyAgentSession(input: {
  clientBrand?: McpOAuthClientBrand;
  close?: boolean;
  message?: string;
  options?: readonly string[];
  organizationId: string;
  ownerId: string;
  replies: readonly AgentSessionReply[];
  sessionId: string;
}): Promise<AgentSession> {
  const session = await requireSession(input);
  await insertReplies(session, input.replies, input.clientBrand);
  const text = input.message?.trim();
  if (text) {
    await insertAgentSessionMessage({
      authorId: null,
      authorKind: 'agent',
      clientBrand: input.clientBrand,
      kind: 'message',
      options: input.options,
      sessionId: session.id,
      text,
    });
  }
  await setAgentSessionStatus({ sessionId: session.id, status: input.close ? 'closed' : 'waiting_user' });
  notifySession(input.organizationId, session.sprintId);
  return requireSession(input);
}
