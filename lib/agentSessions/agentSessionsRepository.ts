import type { AgentBridgeStep } from '@/lib/agentSessions/agentBridge';
import type { AgentMention } from '@/lib/agentSessions/agentMentions';
import type {
  AgentSession,
  AgentSessionContext,
  AgentSessionMessage,
  AgentSessionMessageKind,
  AgentSessionOrigin,
  AgentSessionResolution,
  AgentSessionStatus,
  AgentSessionTarget,
  AgentSessionTargetKind,
} from '@/lib/agentSessions/agentSession';
import type { AgentSessionSkill } from '@/lib/agentSessions/agentSkills';

import { parseAgentBridgeStep } from '@/lib/agentSessions/agentBridge';
import { parseAgentSessionSkill } from '@/lib/agentSessions/agentSkills';
import { STAFF_AUTHOR_DISPLAY_NAME_SQL } from '@/lib/comments/commentAuthor';
import { query } from '@/lib/db';
import { getBeerTrackerSchema } from '@/lib/env';
import { planPatchClientBrandFromUnknown } from '@/lib/sprints/sprintPlanPatchPositionPreview';

type DbTimestamp = Date | string;

interface SessionRow {
  agent_step: string | null;
  agent_step_at: DbTimestamp | null;
  closed_at: DbTimestamp | null;
  context: unknown;
  created_at: DbTimestamp;
  id: string;
  origin: string;
  owner_id: string;
  sprint_id: number;
  status: string;
  task_id: string | null;
  title: string;
  updated_at: DbTimestamp;
}

interface MessageRow {
  author_kind: string;
  author_name: string | null;
  client_brand: string | null;
  created_at: DbTimestamp;
  id: string;
  kind: string;
  mentions: unknown;
  options: unknown;
  proposal_id: string | null;
  reply_to: string | null;
  resolution: string | null;
  session_id: string;
  skill_id: string | null;
  skill_params: unknown;
  target_id: string | null;
  target_kind: string | null;
  target_label: string | null;
  text: string;
}

/** Закрытые сессии ещё неделю видны в планере: успеть прочитать ответы агента. */
const CLOSED_VISIBLE_DAYS = 7;

/** Тот же шаг агента пишем не чаще: каждый вызов тула — это ещё и перезапрос сессий в планере. */
const ACTIVITY_THROTTLE_SECONDS = 20;

let schemaEnsured = false;
let schemaEnsurePromise: Promise<void> | null = null;

function qualifySchemaName(schema: string): string {
  return schema.includes('-') ? `"${schema}"` : schema;
}

async function ensureAgentSessionsSchema(): Promise<void> {
  if (schemaEnsured) {
    return;
  }
  schemaEnsurePromise ??= runEnsureAgentSessionsSchema();
  await schemaEnsurePromise;
}

async function runEnsureAgentSessionsSchema(): Promise<void> {
  try {
    const schema = qualifySchemaName(getBeerTrackerSchema());
    await query(`
      CREATE TABLE IF NOT EXISTS ${schema}.agent_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES ${schema}.organizations (id) ON DELETE CASCADE,
        sprint_id INTEGER NOT NULL,
        owner_id VARCHAR(255) NOT NULL,
        task_id VARCHAR(255),
        title TEXT NOT NULL,
        context JSONB NOT NULL DEFAULT '{}'::jsonb,
        origin VARCHAR(16) NOT NULL CHECK (origin IN ('planner', 'agent')),
        status VARCHAR(16) NOT NULL CHECK (status IN ('waiting_agent', 'waiting_user', 'closed')),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP WITH TIME ZONE
      )
    `);
    await query(`
      ALTER TABLE ${schema}.agent_sessions
        ADD COLUMN IF NOT EXISTS agent_step VARCHAR(16),
        ADD COLUMN IF NOT EXISTS agent_step_at TIMESTAMP WITH TIME ZONE
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_agent_sessions_owner
        ON ${schema}.agent_sessions (organization_id, owner_id, status)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_agent_sessions_sprint
        ON ${schema}.agent_sessions (organization_id, sprint_id)
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS ${schema}.agent_session_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES ${schema}.agent_sessions (id) ON DELETE CASCADE,
        author_kind VARCHAR(8) NOT NULL CHECK (author_kind IN ('user', 'agent')),
        author_id VARCHAR(255),
        kind VARCHAR(16) NOT NULL CHECK (kind IN ('request', 'comment', 'redo', 'message', 'draft', 'reply')),
        text TEXT NOT NULL,
        target_kind VARCHAR(16) CHECK (target_kind IN ('position', 'goal', 'note')),
        target_id VARCHAR(255),
        target_label TEXT,
        proposal_id VARCHAR(64),
        reply_to UUID REFERENCES ${schema}.agent_session_messages (id) ON DELETE CASCADE,
        resolution VARCHAR(16) CHECK (resolution IN ('addressed', 'declined')),
        mentions JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`
      ALTER TABLE ${schema}.agent_session_messages
        ADD COLUMN IF NOT EXISTS mentions JSONB NOT NULL DEFAULT '[]'::jsonb
    `);
    await query(`
      ALTER TABLE ${schema}.agent_session_messages
        ADD COLUMN IF NOT EXISTS client_brand VARCHAR(16)
    `);
    await query(`
      ALTER TABLE ${schema}.agent_session_messages
        ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS skill_id VARCHAR(32),
        ADD COLUMN IF NOT EXISTS skill_params JSONB NOT NULL DEFAULT '{}'::jsonb
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_agent_session_messages_session
        ON ${schema}.agent_session_messages (session_id, created_at)
    `);
    schemaEnsured = true;
  } catch (error) {
    schemaEnsurePromise = null;
    throw error;
  }
}

function toIso(value: DbTimestamp): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toIsoOrNull(value: DbTimestamp | null): string | null {
  return value == null ? null : toIso(value);
}

function parseStatus(value: string): AgentSessionStatus {
  return value === 'waiting_agent' || value === 'closed' ? value : 'waiting_user';
}

const MESSAGE_KINDS: ReadonlySet<string> = new Set(['comment', 'draft', 'message', 'redo', 'reply', 'request']);

function parseKind(value: string): AgentSessionMessageKind {
  return MESSAGE_KINDS.has(value) ? (value as AgentSessionMessageKind) : 'message';
}

function parseTarget(row: MessageRow): AgentSessionTarget | null {
  if (!row.target_id || (row.target_kind !== 'goal' && row.target_kind !== 'note' && row.target_kind !== 'position')) {
    return null;
  }
  return { id: row.target_id, kind: row.target_kind, label: row.target_label };
}

function parseResolution(value: string | null): AgentSessionResolution | null {
  return value === 'addressed' || value === 'declined' ? value : null;
}

function parseContext(value: unknown): AgentSessionContext {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const record = value as Record<string, unknown>;
  const context: AgentSessionContext = {};
  for (const key of ['assigneeName', 'sprintName', 'summary', 'taskKey'] as const) {
    const field = record[key];
    if (typeof field === 'string' && field) {
      context[key] = field;
    }
  }
  return context;
}

function parseMentions(value: unknown): AgentMention[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    const record = item as Partial<AgentMention> | null;
    const kind = record?.kind;
    if (!record?.id || !record.label || (kind !== 'note' && kind !== 'person' && kind !== 'task')) {
      return [];
    }
    return [{ id: record.id, kind, label: record.label }];
  });
}

function parseOptions(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item !== '') : [];
}

function messageFromRow(row: MessageRow): AgentSessionMessage {
  const clientBrand = planPatchClientBrandFromUnknown(row.client_brand);
  return {
    authorKind: row.author_kind === 'agent' ? 'agent' : 'user',
    authorName: row.author_name,
    ...(clientBrand ? { clientBrand } : {}),
    createdAt: toIso(row.created_at),
    id: row.id,
    kind: parseKind(row.kind),
    mentions: parseMentions(row.mentions),
    options: parseOptions(row.options),
    proposalId: row.proposal_id,
    replyTo: row.reply_to,
    resolution: parseResolution(row.resolution),
    skill: parseAgentSessionSkill(row.skill_id, row.skill_params),
    target: parseTarget(row),
    text: row.text,
  };
}

function sessionFromRow(row: SessionRow, messages: AgentSessionMessage[]): AgentSession {
  return {
    agentActivity:
      row.agent_step && row.agent_step_at
        ? { at: toIso(row.agent_step_at), step: parseAgentBridgeStep(row.agent_step) }
        : null,
    closedAt: toIsoOrNull(row.closed_at),
    context: parseContext(row.context),
    createdAt: toIso(row.created_at),
    id: row.id,
    messages,
    origin: row.origin === 'agent' ? 'agent' : 'planner',
    ownerId: row.owner_id,
    sprintId: row.sprint_id,
    status: parseStatus(row.status),
    taskId: row.task_id,
    title: row.title,
    updatedAt: toIso(row.updated_at),
  };
}

const SESSION_COLUMNS = `s.id::text AS id, s.sprint_id, s.owner_id, s.task_id, s.title, s.context,
       s.origin, s.status, s.created_at, s.updated_at, s.closed_at, s.agent_step, s.agent_step_at`;

async function loadMessages(sessionIds: readonly string[]): Promise<Map<string, AgentSessionMessage[]>> {
  const bySession = new Map<string, AgentSessionMessage[]>();
  if (sessionIds.length === 0) {
    return bySession;
  }
  const result = await query<MessageRow>(
    `SELECT DISTINCT ON (m.created_at, m.id)
            m.id::text AS id, m.session_id::text AS session_id, m.author_kind, m.kind, m.text,
            m.target_kind, m.target_id, m.target_label, m.mentions, m.options, m.proposal_id, m.reply_to::text AS reply_to,
            m.resolution, m.created_at, m.client_brand, m.skill_id, m.skill_params,
            ${STAFF_AUTHOR_DISPLAY_NAME_SQL} AS author_name
       FROM agent_session_messages m
       LEFT JOIN staff s
         ON LOWER(s.id::text) = LOWER(m.author_id)
         OR NULLIF(TRIM(s.tracker_user_id), '') = m.author_id
      WHERE m.session_id = ANY($1::uuid[])
      ORDER BY m.created_at, m.id`,
    [[...sessionIds]]
  );
  for (const row of result.rows) {
    const list = bySession.get(row.session_id) ?? [];
    list.push(messageFromRow(row));
    bySession.set(row.session_id, list);
  }
  return bySession;
}

async function withMessages(rows: readonly SessionRow[]): Promise<AgentSession[]> {
  const messages = await loadMessages(rows.map((row) => row.id));
  return rows.map((row) => sessionFromRow(row, messages.get(row.id) ?? []));
}

export async function createAgentSession(input: {
  context: AgentSessionContext;
  organizationId: string;
  origin: AgentSessionOrigin;
  ownerId: string;
  sprintId: number;
  status: AgentSessionStatus;
  taskId: string | null;
  title: string;
}): Promise<string> {
  await ensureAgentSessionsSchema();
  const result = await query<{ id: string }>(
    `INSERT INTO agent_sessions (organization_id, sprint_id, owner_id, task_id, title, context, origin, status)
     VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb, $7, $8)
     RETURNING id::text AS id`,
    [
      input.organizationId,
      input.sprintId,
      input.ownerId,
      input.taskId,
      input.title,
      JSON.stringify(input.context),
      input.origin,
      input.status,
    ]
  );
  const id = result.rows[0]?.id;
  if (!id) {
    throw new Error('agent_sessions insert failed');
  }
  return id;
}

export async function insertAgentSessionMessage(input: {
  authorId: string | null;
  authorKind: 'agent' | 'user';
  /** Клиент MCP, которым писал агент. */
  clientBrand?: string | null;
  kind: AgentSessionMessageKind;
  mentions?: readonly AgentMention[];
  options?: readonly string[];
  proposalId?: string | null;
  replyTo?: string | null;
  resolution?: AgentSessionResolution | null;
  sessionId: string;
  skill?: AgentSessionSkill | null;
  target?: { id: string; kind: AgentSessionTargetKind; label?: string | null } | null;
  text: string;
}): Promise<string> {
  await ensureAgentSessionsSchema();
  const result = await query<{ id: string }>(
    `INSERT INTO agent_session_messages (
       session_id, author_kind, author_id, kind, text, target_kind, target_id, target_label,
       proposal_id, reply_to, resolution, mentions, client_brand, options,
       skill_id, skill_params
     )
     VALUES (
       $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10::uuid, $11, $12::jsonb, $13, $14::jsonb, $15, $16::jsonb
     )
     RETURNING id::text AS id`,
    [
      input.sessionId,
      input.authorKind,
      input.authorId,
      input.kind,
      input.text,
      input.target?.kind ?? null,
      input.target?.id ?? null,
      input.target?.label ?? null,
      input.proposalId ?? null,
      input.replyTo ?? null,
      input.resolution ?? null,
      JSON.stringify(input.mentions ?? []),
      input.clientBrand ?? null,
      JSON.stringify(input.options ?? []),
      input.skill?.id ?? null,
      JSON.stringify(input.skill?.params ?? {}),
    ]
  );
  await query(`UPDATE agent_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1::uuid`, [
    input.sessionId,
  ]);
  const id = result.rows[0]?.id;
  if (!id) {
    throw new Error('agent_session_messages insert failed');
  }
  return id;
}

export async function setAgentSessionStatus(input: {
  sessionId: string;
  status: AgentSessionStatus;
}): Promise<void> {
  await ensureAgentSessionsSchema();
  await query(
    `UPDATE agent_sessions
        SET status = $2::varchar,
            updated_at = CURRENT_TIMESTAMP,
            closed_at = CASE WHEN $2::varchar = 'closed' THEN CURRENT_TIMESTAMP ELSE NULL END
      WHERE id = $1::uuid`,
    [input.sessionId, input.status]
  );
}

/** Сессия владельца (сессии приватны: чужую не отдаём). */
export async function getAgentSession(input: {
  organizationId: string;
  ownerId: string;
  sessionId: string;
}): Promise<AgentSession | null> {
  await ensureAgentSessionsSchema();
  const result = await query<SessionRow>(
    `SELECT ${SESSION_COLUMNS}
       FROM agent_sessions s
      WHERE s.id = $1::uuid
        AND s.organization_id = $2::uuid
        AND LOWER(s.owner_id) = LOWER($3)
      LIMIT 1`,
    [input.sessionId, input.organizationId, input.ownerId]
  );
  const [session] = await withMessages(result.rows);
  return session ?? null;
}

/**
 * Сессии владельца. По умолчанию — незакрытые плюс закрытые за последнюю неделю;
 * `statuses` сужает (входящие агента — только `waiting_agent`).
 */
export async function listAgentSessions(input: {
  limit?: number;
  organizationId: string;
  ownerId: string;
  sprintId?: number;
  statuses?: readonly AgentSessionStatus[];
}): Promise<AgentSession[]> {
  await ensureAgentSessionsSchema();
  const result = await query<SessionRow>(
    `SELECT ${SESSION_COLUMNS}
       FROM agent_sessions s
      WHERE s.organization_id = $1::uuid
        AND LOWER(s.owner_id) = LOWER($2)
        AND ($3::int IS NULL OR s.sprint_id = $3)
        AND (
          ($4::text[] IS NOT NULL AND s.status = ANY($4::text[]))
          OR ($4::text[] IS NULL AND (s.status <> 'closed'
               OR s.closed_at >= CURRENT_TIMESTAMP - make_interval(days => $5)))
        )
      ORDER BY s.updated_at DESC
      LIMIT $6`,
    [
      input.organizationId,
      input.ownerId,
      input.sprintId ?? null,
      input.statuses ? [...input.statuses] : null,
      CLOSED_VISIBLE_DAYS,
      input.limit ?? 50,
    ]
  );
  return withMessages(result.rows);
}

/** Незакрытая сессия владельца, в которой лежит его текущий драфт в спринте. */
export async function findAgentSessionByProposal(input: {
  organizationId: string;
  ownerId: string;
  proposalId: string;
  sprintId: number;
}): Promise<string | null> {
  await ensureAgentSessionsSchema();
  const result = await query<{ id: string }>(
    `SELECT s.id::text AS id
       FROM agent_sessions s
       JOIN agent_session_messages m ON m.session_id = s.id AND m.kind = 'draft'
      WHERE s.organization_id = $1::uuid
        AND LOWER(s.owner_id) = LOWER($2)
        AND s.sprint_id = $3
        AND s.status <> 'closed'
        AND m.proposal_id = $4
      ORDER BY m.created_at DESC
      LIMIT 1`,
    [input.organizationId, input.ownerId, input.sprintId, input.proposalId]
  );
  return result.rows[0]?.id ?? null;
}

/** Отозвать свою реплику, пока агент на неё не ответил и после неё в сессии ничего не было. */
export async function deleteOwnAgentSessionMessage(input: {
  authorId: string;
  messageId: string;
  sessionId: string;
}): Promise<boolean> {
  await ensureAgentSessionsSchema();
  const result = await query(
    `DELETE FROM agent_session_messages m
      WHERE m.id = $1::uuid
        AND m.session_id = $2::uuid
        AND m.author_kind = 'user'
        AND LOWER(m.author_id) = LOWER($3)
        AND m.kind IN ('comment', 'message', 'redo')
        AND NOT EXISTS (SELECT 1 FROM agent_session_messages r WHERE r.reply_to = m.id)`,
    [input.messageId, input.sessionId, input.authorId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Агент вызвал тул MCP: шаг — в ждущие его сессии владельца (одну, если тул про сессию;
 * сессии спринта, если про спринт). Возвращает спринты, где шаг записался — их планеру и пнуть.
 */
export async function touchAgentSessionActivity(input: {
  organizationId: string;
  ownerId: string;
  sessionId: string | null;
  sprintId: number | null;
  step: AgentBridgeStep;
}): Promise<number[]> {
  await ensureAgentSessionsSchema();
  const result = await query<{ sprint_id: number }>(
    `UPDATE agent_sessions s
        SET agent_step = $5::varchar, agent_step_at = CURRENT_TIMESTAMP
      WHERE s.organization_id = $1::uuid
        AND LOWER(s.owner_id) = LOWER($2)
        AND s.status = 'waiting_agent'
        AND ($3::uuid IS NULL OR s.id = $3::uuid)
        AND ($4::int IS NULL OR s.sprint_id = $4)
        AND (s.agent_step IS DISTINCT FROM $5::varchar
             OR s.agent_step_at < CURRENT_TIMESTAMP - make_interval(secs => $6))
      RETURNING s.sprint_id`,
    [input.organizationId, input.ownerId, input.sessionId, input.sprintId, input.step, ACTIVITY_THROTTLE_SECONDS]
  );
  return [...new Set(result.rows.map((row) => row.sprint_id))];
}
