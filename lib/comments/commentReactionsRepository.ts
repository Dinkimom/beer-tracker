import type { QueryParams } from '@/types';

import { STAFF_AUTHOR_DISPLAY_NAME_SQL } from '@/lib/comments/commentAuthor';
import {
  hydrateStickyNoteReactionUsers,
  type StickyNoteReaction,
} from '@/lib/comments/stickyNoteReaction';
import { query } from '@/lib/db';
import { sprintTenantParams, sprintTenantWhere } from '@/lib/sprints/sprintTenantSql';

interface CommentReactionSummaryRow {
  comment_id: string;
  count: number | string;
  emoji: string;
  mine: boolean;
  user_ids?: unknown;
}

async function commentExistsInSprint(input: {
  commentId: string;
  organizationId: string;
  sprintId: number;
}): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM comments
      WHERE ${sprintTenantWhere()} AND id = $2
      LIMIT 1`,
    [...sprintTenantParams(input.sprintId), input.commentId] as QueryParams
  );
  return result.rows.length > 0;
}

/** Агрегаты по emoji; порядок чипов — первое появление (MIN(created_at)), не count. */
async function listCommentReactionSummaries(input: {
  commentIds: readonly string[];
  organizationId: string;
  userId: string;
}): Promise<Record<string, StickyNoteReaction[]>> {
  if (input.commentIds.length === 0) {
    return {};
  }
  const result = await query<CommentReactionSummaryRow>(
    `SELECT comment_id,
            emoji,
            COUNT(*)::int AS count,
            BOOL_OR(user_id = $1) AS mine,
            ARRAY_AGG(user_id ORDER BY created_at ASC, user_id) AS user_ids
       FROM comment_reactions
      WHERE organization_id = $2 AND comment_id = ANY($3::uuid[])
      GROUP BY comment_id, emoji
      ORDER BY comment_id, MIN(created_at) ASC, emoji`,
    [input.userId, input.organizationId, [...input.commentIds]]
  );
  const namesById = await queryRegistryReactionUserNames(
    result.rows.flatMap((row) => parseReactionUserIds(row.user_ids))
  );
  return groupCommentReactionSummaryRows(result.rows, namesById, input.userId);
}

export async function toggleSprintCommentReaction(input: {
  commentId: string;
  emoji: string;
  organizationId: string;
  sprintId: number;
  userId: string;
}): Promise<{ notFound: true } | { reactions: StickyNoteReaction[] }> {
  const exists = await commentExistsInSprint(input);
  if (!exists) {
    return { notFound: true };
  }
  const reactions = await toggleCommentReaction({
    commentId: input.commentId,
    emoji: input.emoji,
    organizationId: input.organizationId,
    userId: input.userId,
  });
  return { reactions };
}

async function toggleCommentReaction(input: {
  commentId: string;
  emoji: string;
  organizationId: string;
  userId: string;
}): Promise<StickyNoteReaction[]> {
  await query(
    `WITH deleted AS (
       DELETE FROM comment_reactions
        WHERE comment_id = $1::uuid AND user_id = $2 AND emoji = $3
        RETURNING comment_id
     )
     INSERT INTO comment_reactions (organization_id, comment_id, user_id, emoji)
     SELECT $4::uuid, $1::uuid, $2, $3
      WHERE NOT EXISTS (SELECT 1 FROM deleted)`,
    [input.commentId, input.userId, input.emoji, input.organizationId]
  );
  const summaries = await listCommentReactionSummaries({
    commentIds: [input.commentId],
    organizationId: input.organizationId,
    userId: input.userId,
  });
  return summaries[input.commentId] ?? [];
}

export async function attachCommentReactionSummaries<T extends { id: string }>(input: {
  comments: T[];
  organizationId: string;
  userId: string;
}): Promise<Array<T & { reactions: StickyNoteReaction[] }>> {
  try {
    const summaries = await listCommentReactionSummaries({
      commentIds: input.comments.map((comment) => comment.id),
      organizationId: input.organizationId,
      userId: input.userId,
    });
    return input.comments.map((comment) => ({
      ...comment,
      reactions: summaries[comment.id] ?? [],
    }));
  } catch (error) {
    console.error('Error attaching comment reactions:', error);
    return input.comments.map((comment) => ({ ...comment, reactions: [] }));
  }
}

export function groupCommentReactionSummaryRows(
  rows: readonly CommentReactionSummaryRow[],
  namesById: Readonly<Record<string, string | null>> = {},
  currentUserId = ''
): Record<string, StickyNoteReaction[]> {
  const byCommentId: Record<string, StickyNoteReaction[]> = {};
  for (const row of rows) {
    const count = typeof row.count === 'number' ? row.count : Number(row.count);
    if (!Number.isInteger(count) || count < 1) {
      continue;
    }
    const list = byCommentId[row.comment_id] ?? [];
    list.push({
      count,
      emoji: row.emoji,
      mine: row.mine === true,
      users: hydrateStickyNoteReactionUsers(
        parseReactionUserIds(row.user_ids),
        namesById,
        currentUserId
      ),
    });
    byCommentId[row.comment_id] = list;
  }
  return byCommentId;
}

function parseReactionUserIds(value: unknown): string[] {
  return parsePgTextList(value).filter((id) => id.length > 0);
}

function parsePgTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(stringifyPgTextItem);
  }
  if (typeof value !== 'string') {
    return [];
  }
  return parsePgArrayLiteral(value);
}

function stringifyPgTextItem(item: unknown): string {
  if (typeof item === 'string') {
    return item.trim();
  }
  if (item == null) {
    return '';
  }
  return String(item).trim();
}

function parsePgArrayLiteral(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return trimmed ? [trimmed] : [];
  }
  const inner = trimmed.slice(1, -1);
  if (!inner) {
    return [];
  }
  return inner.split(',').map((item) => item.trim().replace(/^"(.*)"$/, '$1'));
}

interface RegistryReactionNameRow {
  author_name: string | null;
  id: string;
  tracker_id?: string | null;
}

export function indexReactionUserDisplayNameRows(
  rows: readonly RegistryReactionNameRow[]
): Record<string, string | null> {
  const namesById: Record<string, string | null> = {};
  for (const row of rows) {
    assignReactionUserDisplayName(namesById, row.id, row.author_name);
    assignReactionUserDisplayName(namesById, row.tracker_id, row.author_name);
  }
  return namesById;
}

function assignReactionUserDisplayName(
  namesById: Record<string, string | null>,
  key: string | null | undefined,
  name: string | null
): void {
  const id = key?.trim();
  const displayName = name?.trim() || null;
  if (!id || !displayName || namesById[id]) {
    return;
  }
  namesById[id] = displayName;
  namesById[id.toLowerCase()] = displayName;
}

async function queryRegistryReactionUserNames(
  userIds: readonly string[]
): Promise<Record<string, string | null>> {
  const uniqueIds = [...new Set(userIds.map((id) => id.trim()).filter((id) => id.length > 0))];
  if (uniqueIds.length === 0) {
    return {};
  }
  const lookupIds = [...new Set(uniqueIds.flatMap((id) => [id, id.toLowerCase()]))];
  try {
    const staffResult = await query<RegistryReactionNameRow>(
      `SELECT s.id::text AS id,
              NULLIF(TRIM(s.tracker_user_id), '') AS tracker_id,
              ${STAFF_AUTHOR_DISPLAY_NAME_SQL} AS author_name
         FROM staff s
        WHERE LOWER(s.id::text) = ANY($1::text[])
           OR NULLIF(TRIM(s.tracker_user_id), '') = ANY($1::text[])`,
      [lookupIds]
    );
    return indexReactionUserDisplayNameRows(staffResult.rows);
  } catch (error) {
    console.error('Error resolving reaction user names:', error);
    return {};
  }
}
