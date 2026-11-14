import type {
  AgentSession,
  AgentSessionCreateInput,
  AgentSessionReply,
  AgentSessionUserMessageInput,
} from '@/lib/agentSessions/agentSession';
import type { AgentDevResult } from '@/lib/agentSessions/agentSessionKind';
import type { AgentSessionScope } from '@/lib/agentSessions/agentSessionScope';
import type { AgentTaskCandidate } from '@/lib/agentSessions/agentSkills';
import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';

import { agentMcpToolCallsFromBody } from '@/lib/agentSessions/agentActivity';
import {
  agentSessionDraftVersion,
  agentSessionTitleFromIntent,
  draftSessionConflict,
  statusAfterUserMessage,
} from '@/lib/agentSessions/agentSession';
import { agentSessionScopeKey, sprintScope } from '@/lib/agentSessions/agentSessionScope';
import {
  createAgentSession,
  deleteOwnAgentSessionMessage,
  findAgentSessionByProposal,
  getAgentSession,
  insertAgentSessionMessage,
  listAgentSessions,
  setAgentSessionStatus,
  touchAgentSessionActivity,
} from '@/lib/agentSessions/agentSessionsRepository';
import { findActiveMcpOAuthClientMetadata } from '@/lib/mcp/oauth/mcpOAuthRepository';
import { resolveMcpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';
import { findQuarterlyPlanDraft } from '@/lib/quarterlyPlans/quarterlyPlanDraftsRepository';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { loadPendingPlanPatchSnapshot } from '@/lib/sprints/sprintPlanPatchPending';

export class AgentSessionNotFoundError extends Error {
  constructor() {
    super('agent_session_not_found');
  }
}

/** Пинок планеру: доска спринта перечитывает сессии по realtime, квартальная — сама опросом. */
function notifySession(organizationId: string, scope: AgentSessionScope): void {
  if (scope.kind !== 'sprint') return;
  notifySprintRealtime(new Request('http://localhost/api/agent-sessions'), organizationId, scope.sprintId, [
    'agentSessions',
  ]);
}

/** Текущий черновик владельца в спринте или квартале — его версия (proposal id); null — черновика нет. */
async function pendingProposalId(input: {
  organizationId: string;
  ownerId: string;
  scope: AgentSessionScope;
}): Promise<string | null> {
  const { organizationId, ownerId, scope } = input;
  if (scope.kind === 'sprint') {
    return (await loadPendingPlanPatchSnapshot({ organizationId, ownerId, sprintId: scope.sprintId }))?.proposalId ?? null;
  }
  return (await findQuarterlyPlanDraft({ organizationId, ownerId, ref: scope }))?.proposalId ?? null;
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

/** Сессия, которой принадлежит висящий драфт владельца в спринте или квартале (null — драфта нет или он без сессии). */
async function findDraftSessionId(input: {
  organizationId: string;
  ownerId: string;
  scope: AgentSessionScope;
}): Promise<string | null> {
  const proposalId = await pendingProposalId(input);
  return proposalId ? findAgentSessionByProposal({ ...input, proposalId }) : null;
}

/** id сессий с висящим драфтом по областям (`agentSessionScopeKey`) — для пометки очереди во входящих агента. */
export async function draftSessionIdsByScope(input: {
  organizationId: string;
  ownerId: string;
  scopes: readonly AgentSessionScope[];
}): Promise<Map<string, string>> {
  const byScope = new Map<string, string>();
  const unique = new Map(input.scopes.map((scope) => [agentSessionScopeKey(scope), scope]));
  for (const [key, scope] of unique) {
    const sessionId = await findDraftSessionId({ ...input, scope });
    if (sessionId) {
      byScope.set(key, sessionId);
    }
  }
  return byScope;
}

/** Свои сессии в спринте или квартале и id той, где лежит текущий драфт (туда идут 💬 к его пунктам). */
export async function listAgentSessionsForOwner(input: {
  organizationId: string;
  ownerId: string;
  scope: AgentSessionScope;
}): Promise<{
  agentAvailable: boolean;
  agentBrand: McpOAuthClientBrand | null;
  draftSessionId: string | null;
  sessions: AgentSession[];
}> {
  const { scope } = input;
  const [sessions, draftSessionId, agentBrand] = await Promise.all([
    listAgentSessions({
      ...input,
      ...(scope.kind === 'sprint' ? { sprintId: scope.sprintId } : { quarter: { quarter: scope.quarter, year: scope.year } }),
    }),
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
  scope: AgentSessionScope;
}): Promise<AgentSession> {
  const sessionId = await createAgentSession({
    context: input.request.context,
    kind: input.request.kind,
    organizationId: input.organizationId,
    origin: 'planner',
    ownerId: input.ownerId,
    scope: input.scope,
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
  notifySession(input.organizationId, input.scope);
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
  const proposalId = await pendingProposalId({
    organizationId: input.organizationId,
    ownerId: input.ownerId,
    scope: session.scope,
  });
  await insertAgentSessionMessage({
    authorId: input.ownerId,
    authorKind: 'user',
    kind: input.message.kind,
    mentions: input.message.mentions,
    proposalId,
    sessionId: session.id,
    skill: input.message.skill ?? null,
    target: input.message.target,
    text: input.message.text,
  });
  const next = statusAfterUserMessage(input.message.kind, session.status);
  if (next !== session.status) {
    await setAgentSessionStatus({ sessionId: session.id, status: next });
  }
  notifySession(input.organizationId, session.scope);
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
    notifySession(input.organizationId, session.scope);
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
  notifySession(input.organizationId, session.scope);
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
  scope: AgentSessionScope;
  sessionId?: string;
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
    if (agentSessionScopeKey(session.scope) !== agentSessionScopeKey(input.scope)) {
      throw new Error(
        `session_scope_mismatch: session ${session.id} is for ${agentSessionScopeKey(session.scope)}, not ${agentSessionScopeKey(input.scope)}`
      );
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
      scope: input.scope,
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
  notifySession(input.organizationId, input.session.scope);
  return {
    draftVersion: agentSessionDraftVersion(input.session.messages) + 1,
    repliesRecorded,
    sessionId: input.session.id,
  };
}

/**
 * reply_agent_session: агент отвечает без нового драфта (уточнение, отказ, «готово»).
 * `result` — итог сессии разработки: реплика уходит сообщением `result` с веткой, коммитами и тестами.
 */
export async function replyAgentSession(input: {
  clientBrand?: McpOAuthClientBrand;
  close?: boolean;
  message?: string;
  options?: readonly string[];
  organizationId: string;
  ownerId: string;
  replies: readonly AgentSessionReply[];
  result?: AgentDevResult;
  /** Скилл «Что отдать агенту»: задачи, которые можно отдать агенту в работу. */
  candidates?: readonly AgentTaskCandidate[];
  sessionId: string;
}): Promise<AgentSession> {
  const session = await requireSession(input);
  if (input.result && session.kind !== 'dev') {
    throw new Error('validation_failed: result is only for a development session (kind=dev)');
  }
  await insertReplies(session, input.replies, input.clientBrand);
  const text = input.message?.trim();
  if (text) {
    await insertAgentSessionMessage({
      authorId: null,
      authorKind: 'agent',
      clientBrand: input.clientBrand,
      kind: input.result ? 'result' : 'message',
      options: input.options,
      result: input.result ?? null,
      candidates: input.candidates ?? null,
      sessionId: session.id,
      text,
    });
  }
  await setAgentSessionStatus({ sessionId: session.id, status: input.close ? 'closed' : 'waiting_user' });
  notifySession(input.organizationId, session.scope);
  return requireSession(input);
}

/**
 * Тело запроса к /api/mcp: вызовы тулов → шаг агента в ждущих его сессиях и пинок планеру.
 * Так видно, что внешний агент (claude.ai, Cursor…) забрал просьбу и что он делает.
 */
export async function recordAgentMcpActivity(input: {
  body: unknown;
  organizationId: string;
  ownerId: string;
}): Promise<void> {
  const sprintIds = new Set<number>();
  for (const call of agentMcpToolCallsFromBody(input.body)) {
    const touched = await touchAgentSessionActivity({
      organizationId: input.organizationId,
      ownerId: input.ownerId,
      ...call,
    });
    for (const sprintId of touched) {
      sprintIds.add(sprintId);
    }
  }
  for (const sprintId of sprintIds) {
    notifySession(input.organizationId, sprintScope(sprintId));
  }
}
