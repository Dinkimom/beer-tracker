import type { AgentSessionActivity } from '@/lib/agentSessions/agentActivity';
import type { AgentMention } from '@/lib/agentSessions/agentMentions';
import type { AgentDevResult, AgentSessionKind } from '@/lib/agentSessions/agentSessionKind';
import type { AgentSessionSkill } from '@/lib/agentSessions/agentSkills';
import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';

import { z } from 'zod';

import { AgentMentionsSchema } from '@/lib/agentSessions/agentMentions';
import { AGENT_SESSION_KIND_BEHAVIOR, AGENT_SESSION_KINDS } from '@/lib/agentSessions/agentSessionKind';
import { AgentSessionSkillSchema, buildAgentSkillAgentView } from '@/lib/agentSessions/agentSkills';

/**
 * Сессия работы с агентом: одна просьба и всё, что из неё вышло — драфты v1, v2, … и переписка.
 * Сессия приватна: её видит и ведёт только владелец (тот, от чьего имени работает агент).
 */
export type AgentSessionStatus = 'closed' | 'waiting_agent' | 'waiting_user';

/** planner — запрос из планера («Агенту»); agent — агент начал сам (propose_plan_patch из чата). */
export type AgentSessionOrigin = 'agent' | 'planner';

/**
 * request — исходная просьба; comment — 💬 к пункту драфта; redo — «Попросить переделать»;
 * message — свободная реплика; draft — агент положил новую версию драфта; reply — ответ агента на 💬;
 * result — агент закончил задачу в сессии разработки (ветка, коммиты, тесты в `result`).
 */
export type AgentSessionMessageKind = 'comment' | 'draft' | 'message' | 'redo' | 'reply' | 'request' | 'result';

export type AgentSessionTargetKind = 'goal' | 'note' | 'position';

export type AgentSessionResolution = 'addressed' | 'declined';

export interface AgentSessionContext {
  assigneeName?: string;
  sprintName?: string;
  summary?: string;
  /** Ключ задачи для человека (RND-1779). */
  taskKey?: string;
}

export interface AgentSessionTarget {
  id: string;
  kind: AgentSessionTargetKind;
  /** Подпись на момент сообщения: заметка и новая цель в следующей версии драфта получают новый id. */
  label: string | null;
}

export interface AgentSessionMessage {
  authorKind: 'agent' | 'user';
  authorName: string | null;
  /** Каким клиентом MCP написал агент (Claude, Cursor…); у старых ответов и у человека — нет. */
  clientBrand?: McpOAuthClientBrand;
  createdAt: string;
  id: string;
  kind: AgentSessionMessageKind;
  /** Задачи, люди и заметки, упомянутые через «@» (и контекст, из которого открыли окно). */
  mentions: AgentMention[];
  /** Варианты ответа под репликой агента: человек отвечает кнопкой. */
  options: string[];
  /** Версия драфта (short proposal id), к которой относится сообщение. */
  proposalId: string | null;
  replyTo: string | null;
  resolution: AgentSessionResolution | null;
  /** Итог сессии разработки — только у `kind: 'result'`. */
  result?: AgentDevResult;
  /** Скилл, вызванный этой репликой человека («/» в чате или сценарий в новой сессии). */
  skill: AgentSessionSkill | null;
  target: AgentSessionTarget | null;
  text: string;
}

export interface AgentSession {
  /** Последний вызов MCP агентом, пока сессия ждала его; null — не было. */
  agentActivity: AgentSessionActivity | null;
  closedAt: string | null;
  context: AgentSessionContext;
  createdAt: string;
  id: string;
  kind: AgentSessionKind;
  messages: AgentSessionMessage[];
  origin: AgentSessionOrigin;
  ownerId: string;
  sprintId: number;
  status: AgentSessionStatus;
  /** Задача, про которую просьба; null — про спринт целиком. */
  taskId: string | null;
  title: string;
  updatedAt: string;
}

export const AGENT_SESSION_TEXT_MAX = 2000;
const LABEL_MAX = 300;

function clipLabel(value: string): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length <= LABEL_MAX ? flat : `${flat.slice(0, LABEL_MAX - 1)}…`;
}

const optionalLabel = z.string().transform(clipLabel).optional();

export const AgentSessionCreateSchema = z
  .object({
    context: z
      .object({
        assigneeName: optionalLabel,
        sprintName: optionalLabel,
        summary: optionalLabel,
        taskKey: optionalLabel,
      })
      .default({}),
    /** dev — отдать задачу `taskId` агенту в работу. */
    kind: z.enum(AGENT_SESSION_KINDS).default('plan'),
    mentions: AgentMentionsSchema.default([]),
    skill: AgentSessionSkillSchema.optional(),
    taskId: z.string().trim().min(1).max(255).optional(),
    text: z.string().trim().min(1).max(AGENT_SESSION_TEXT_MAX),
    /** Заголовок сессии; по умолчанию — текст просьбы (для скилла — его название). */
    title: optionalLabel,
  })
  .refine((value) => value.kind !== 'dev' || value.taskId != null, {
    message: 'taskId is required for a dev session',
    path: ['taskId'],
  });

export type AgentSessionCreateInput = z.infer<typeof AgentSessionCreateSchema>;
/** Тело запроса из планера (до разбора схемой: mentions/context можно не передавать). */
export type AgentSessionCreatePayload = z.input<typeof AgentSessionCreateSchema>;

const AgentSessionMentionsDefault = AgentMentionsSchema.default([]);

const TargetSchema = z.object({
  id: z.string().trim().min(1).max(255),
  kind: z.enum(['goal', 'note', 'position']),
  label: z.string().transform(clipLabel).optional(),
});

export const AgentSessionUserMessageSchema = z
  .object({
    kind: z.enum(['comment', 'message', 'redo']),
    mentions: AgentSessionMentionsDefault,
    skill: AgentSessionSkillSchema.optional(),
    target: TargetSchema.optional(),
    text: z.string().trim().max(AGENT_SESSION_TEXT_MAX),
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'comment' && !value.target) {
      ctx.addIssue({ code: 'custom', message: 'target is required', path: ['target'] });
    }
    if (value.skill && value.kind !== 'message') {
      ctx.addIssue({ code: 'custom', message: 'skill goes with a message', path: ['skill'] });
    }
    if (value.kind !== 'redo' && !value.text) {
      ctx.addIssue({ code: 'custom', message: 'text is required', path: ['text'] });
    }
  });

export type AgentSessionUserMessageInput = z.infer<typeof AgentSessionUserMessageSchema>;
export type AgentSessionUserMessagePayload = z.input<typeof AgentSessionUserMessageSchema>;

/** Ответы агента на 💬 к пунктам драфта. */
export const AgentSessionRepliesSchema = z
  .array(
    z.object({
      messageId: z.string().uuid(),
      resolution: z.enum(['addressed', 'declined']),
      text: z.string().trim().min(1).max(AGENT_SESSION_TEXT_MAX),
    })
  )
  .max(100);

export type AgentSessionReply = z.infer<typeof AgentSessionRepliesSchema>[number];

export function parseAgentSessionReplies(raw: unknown): AgentSessionReply[] {
  if (raw == null) {
    return [];
  }
  const parsed = AgentSessionRepliesSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `validation_failed: replies: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`
    );
  }
  return parsed.data;
}

/** Статус после реплики человека: просьба, «переделать» и вопрос зовут агента; 💬 копится. */
export function statusAfterUserMessage(
  kind: AgentSessionUserMessageInput['kind'],
  current: AgentSessionStatus
): AgentSessionStatus {
  if (kind === 'comment') {
    return current === 'closed' ? 'waiting_user' : current;
  }
  return 'waiting_agent';
}

export function agentSessionTargetKey(kind: AgentSessionTargetKind, id: string): string {
  return `${kind}:${id}`;
}

export interface AgentSessionItemComment {
  comment: AgentSessionMessage;
  /** Ответа агента ещё нет. */
  open: boolean;
  replies: AgentSessionMessage[];
}

/** 💬 к пунктам драфта с ответами агента, по ключу пункта. */
export function groupAgentSessionItemComments(
  messages: readonly AgentSessionMessage[]
): Map<string, AgentSessionItemComment[]> {
  const repliesByComment = new Map<string, AgentSessionMessage[]>();
  for (const message of messages) {
    if (message.kind === 'reply' && message.replyTo) {
      const list = repliesByComment.get(message.replyTo) ?? [];
      list.push(message);
      repliesByComment.set(message.replyTo, list);
    }
  }
  const groups = new Map<string, AgentSessionItemComment[]>();
  for (const message of messages) {
    if (message.kind !== 'comment' || !message.target) {
      continue;
    }
    const replies = repliesByComment.get(message.id) ?? [];
    const key = agentSessionTargetKey(message.target.kind, message.target.id);
    const list = groups.get(key) ?? [];
    list.push({ comment: message, open: replies.length === 0, replies });
    groups.set(key, list);
  }
  return groups;
}

export function countOpenAgentSessionComments(messages: readonly AgentSessionMessage[]): number {
  let count = 0;
  for (const group of groupAgentSessionItemComments(messages).values()) {
    count += group.filter((item) => item.open).length;
  }
  return count;
}

/**
 * Скилл, который агент ещё не отработал: у последней реплики человека со скиллом
 * после последнего ответа агента. null — такой нет.
 */
export function pendingAgentSessionSkill(messages: readonly AgentSessionMessage[]): AgentSessionSkill | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.authorKind === 'agent') {
      return null;
    }
    if (message?.skill) {
      return message.skill;
    }
  }
  return null;
}

export function agentSessionDraftVersion(messages: readonly AgentSessionMessage[]): number {
  return messages.filter((message) => message.kind === 'draft').length;
}

/**
 * Задачи, о которых сейчас речь: задача сессии и упомянутые в репликах человека после последнего
 * ответа агента (чат, открытый с карточки, дописывает в уже идущую сессию — задача только в mentions).
 */
function pendingTaskKeys(session: Pick<AgentSession, 'messages' | 'taskId'>): string[] {
  const keys = new Set(session.taskId ? [session.taskId] : []);
  const lastAgent = session.messages.findLastIndex((message) => message.authorKind === 'agent');
  for (const message of session.messages.slice(lastAgent + 1)) {
    for (const mention of message.mentions) {
      if (mention.kind === 'task') {
        keys.add(mention.id);
      }
    }
  }
  return [...keys];
}

function fetchContextCall(session: Pick<AgentSession, 'messages' | 'sprintId' | 'taskId'>): string {
  const keys = pendingTaskKeys(session);
  return keys.length > 0
    ? `get_sprint_context(sprintId: ${session.sprintId}, taskIds: ${JSON.stringify(keys)})`
    : `get_sprint_context(sprintId: ${session.sprintId})`;
}


interface AgentSessionAgentView {
  context: AgentSessionContext;
  conversation: Array<{
    at: string;
    from: 'agent' | 'user';
    id: string;
    kind: AgentSessionMessageKind;
    mentions?: AgentMention[];
    options?: string[];
    replyTo?: string;
    resolution?: AgentSessionResolution;
    result?: AgentDevResult;
    skill?: ReturnType<typeof buildAgentSkillAgentView>;
    target?: AgentSessionTarget;
    text: string;
  }>;
  draftVersion: number;
  fetchContext: string;
  hint: string;
  id: string;
  kind: AgentSessionKind;
  /** id сообщений-💬 без ответа агента. */
  openComments: string[];
  skill?: ReturnType<typeof buildAgentSkillAgentView>;
  sprintId: number;
  status: AgentSessionStatus;
  taskId: string | null;
  title: string;
}

export function buildAgentSessionAgentView(session: AgentSession): AgentSessionAgentView {
  const behavior = AGENT_SESSION_KIND_BEHAVIOR[session.kind];
  const pendingSkill = pendingAgentSessionSkill(session.messages);
  const openComments: string[] = [];
  for (const group of groupAgentSessionItemComments(session.messages).values()) {
    for (const item of group) {
      if (item.open) {
        openComments.push(item.comment.id);
      }
    }
  }
  return {
    context: session.context,
    conversation: session.messages.map((message) => ({
      at: message.createdAt,
      from: message.authorKind,
      id: message.id,
      kind: message.kind,
      ...(message.mentions.length > 0 ? { mentions: message.mentions } : {}),
      ...(message.options.length > 0 ? { options: message.options } : {}),
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      ...(message.resolution ? { resolution: message.resolution } : {}),
      ...(message.result ? { result: message.result } : {}),
      ...(message.skill ? { skill: buildAgentSkillAgentView(message.skill) } : {}),
      ...(message.target ? { target: message.target } : {}),
      text: message.text,
    })),
    draftVersion: agentSessionDraftVersion(session.messages),
    fetchContext: behavior.fetchContext(session) ?? fetchContextCall(session),
    hint: behavior.hint,
    id: session.id,
    kind: session.kind,
    openComments,
    ...(pendingSkill ? { skill: buildAgentSkillAgentView(pendingSkill) } : {}),
    sprintId: session.sprintId,
    status: session.status,
    taskId: session.taskId,
    title: session.title,
  };
}

/** Строка входящих агента: без переписки, только что и где. */
export function summarizeAgentSessionForAgent(session: AgentSession) {
  const pendingSkill = pendingAgentSessionSkill(session.messages);
  return {
    context: session.context,
    draftVersion: agentSessionDraftVersion(session.messages),
    id: session.id,
    kind: session.kind,
    lastMessage: session.messages.at(-1)?.text ?? '',
    openComments: countOpenAgentSessionComments(session.messages),
    ...(pendingSkill ? { skill: pendingSkill.id } : {}),
    sprintId: session.sprintId,
    status: session.status,
    taskId: session.taskId,
    title: session.title,
    updatedAt: session.updatedAt,
  };
}

/** Заголовок сессии, начатой агентом из чата: его формулировка или первая строка сводки драфта. */
export function agentSessionTitleFromIntent(intent: string | undefined, fallback: string): string {
  const source = intent?.trim() || fallback;
  return clipLabel(source) || fallback;
}

/**
 * Один драфт = одна сессия. Пока на доске висит драфт сессии A, драфт другой сессии класть нельзя:
 * иначе replacePending молча снесёт чужую работу. Возвращает текст ошибки или null.
 */
export function draftSessionConflict(input: {
  draftSessionId: string | null;
  requestedSessionId: string;
}): string | null {
  if (!input.draftSessionId || input.draftSessionId === input.requestedSessionId) {
    return null;
  }
  return `draft_belongs_to_other_session: the board has an unreviewed draft of session ${input.draftSessionId}. Work in that session (propose_plan_patch with sessionId=${input.draftSessionId}) or wait until the person accepts/rejects it; answer this session with reply_agent_session meanwhile.`;
}

/** Для входящих агента: сессии спринта, которые ждут, пока разберут драфт другой сессии. */
export function waitingForDraftSessionId(
  session: Pick<AgentSession, 'id' | 'sprintId'>,
  draftSessionBySprint: ReadonlyMap<number, string>
): string | null {
  const draftSessionId = draftSessionBySprint.get(session.sprintId);
  return draftSessionId && draftSessionId !== session.id ? draftSessionId : null;
}
