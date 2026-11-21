/**
 * Строки `issue_field_events` и `board_object_events` → события истории спринта.
 * Чистые функции: без БД, покрыты unit-тестами.
 */

import type {
  SprintHistoryActor,
  SprintHistoryBoardEvent,
  SprintHistoryBoardObject,
  SprintHistoryChannel,
  SprintHistoryEvent,
  SprintHistoryIssueEvent,
  SprintHistoryIssueField,
} from './sprintHistoryTypes';

export interface IssueFieldEventRow {
  author_display: string | null;
  author_id: string | null;
  changed_at: Date | string;
  entry_ord: number;
  field: string;
  field_ord: number;
  from_ids: string[] | null;
  from_text: string | null;
  issue_key: string;
  to_ids: string[] | null;
  to_text: string | null;
}

export interface BoardObjectEventRow {
  action: string;
  actor_id: string | null;
  actor_name: string | null;
  after: Record<string, unknown> | null;
  before: Record<string, unknown> | null;
  channel: string | null;
  client_brand: string | null;
  created_at: Date | string;
  id: number | string;
  object_id: string;
  object_kind: string;
}

const ISSUE_FIELDS: ReadonlySet<string> = new Set<SprintHistoryIssueField>([
  'assignee',
  'deadline',
  'sprint',
  'start',
  'status',
  'storyPoints',
  'testPoints',
]);
const CHANNELS: ReadonlySet<string> = new Set<SprintHistoryChannel>(['agent', 'system', 'ui']);
const BOARD_OBJECTS: ReadonlySet<string> = new Set<SprintHistoryBoardObject>(['goal', 'link', 'note']);
const BOARD_ACTIONS: ReadonlySet<string> = new Set(['create', 'delete', 'update']);

function isoTime(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function sprintChange(row: IssueFieldEventRow, sprintId: string): 'added' | 'removed' | null {
  const wasIn = (row.from_ids ?? []).includes(sprintId);
  const isIn = (row.to_ids ?? []).includes(sprintId);
  if (isIn === wasIn) return null;
  return isIn ? 'added' : 'removed';
}

/** null — строка не про этот спринт (смена другого спринта) или неизвестное поле. */
export function issueFieldRowToEvent(row: IssueFieldEventRow, sprintId: number): SprintHistoryIssueEvent | null {
  if (!ISSUE_FIELDS.has(row.field)) return null;
  const field = row.field as SprintHistoryIssueField;
  const change = field === 'sprint' ? sprintChange(row, String(sprintId)) : 'changed';
  if (!change) return null;
  return {
    actor: { channel: null, clientBrand: null, id: row.author_id, name: row.author_display },
    at: isoTime(row.changed_at),
    change,
    field,
    from: row.from_text,
    id: `t:${row.issue_key}:${row.entry_ord}:${row.field_ord}`,
    issueKey: row.issue_key,
    source: 'tracker',
    to: row.to_text,
  };
}

function textOf(snapshot: Record<string, unknown> | null): string | null {
  const text = snapshot?.text;
  return typeof text === 'string' && text.trim() ? text : null;
}

function changedFields(before: Record<string, unknown> | null, after: Record<string, unknown> | null): string[] {
  if (!before || !after) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys]
    .filter((key) => JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null))
    .sort();
}

function linkEnds(snapshot: Record<string, unknown> | null): { from: string; to: string } | null {
  const from = snapshot?.fromTaskId;
  const to = snapshot?.toTaskId;
  return typeof from === 'string' && typeof to === 'string' ? { from, to } : null;
}

function boardActor(row: BoardObjectEventRow): SprintHistoryActor {
  return {
    channel: row.channel && CHANNELS.has(row.channel) ? (row.channel as SprintHistoryChannel) : null,
    clientBrand: row.client_brand?.trim() || null,
    id: row.actor_id,
    name: row.actor_name,
  };
}

export function boardObjectRowToEvent(row: BoardObjectEventRow): SprintHistoryBoardEvent | null {
  if (!BOARD_OBJECTS.has(row.object_kind) || !BOARD_ACTIONS.has(row.action)) return null;
  const current = row.after ?? row.before;
  const fields = changedFields(row.before, row.after);
  const done = current?.done;
  return {
    action: row.action as SprintHistoryBoardEvent['action'],
    actor: boardActor(row),
    at: isoTime(row.created_at),
    changedFields: fields,
    done: typeof done === 'boolean' ? done : null,
    id: `b:${row.id}`,
    linkEnds: row.object_kind === 'link' ? linkEnds(current) : null,
    object: row.object_kind as SprintHistoryBoardObject,
    objectId: row.object_id,
    previousText: fields.includes('text') ? textOf(row.before) : null,
    source: 'board',
    text: textOf(current),
  };
}

/** Обе ленты в одну: новые сверху, не больше `limit`. */
export function mergeSprintHistory(
  issueEvents: readonly SprintHistoryIssueEvent[],
  boardEvents: readonly SprintHistoryBoardEvent[],
  limit: number
): SprintHistoryEvent[] {
  return [...issueEvents, ...boardEvents]
    .sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id))
    .slice(0, limit);
}
