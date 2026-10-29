import type { BeerTrackerTransactionQuery } from '@/lib/db';
import type { QueryParams, TaskParent } from '@/types';

import {
  STAFF_AUTHOR_DISPLAY_NAME_SQL,
  collectCommentAuthorIds,
  mergeCommentAuthorNames,
} from '@/lib/comments/commentAuthor';
import { resolveCommentCreatedBy } from '@/lib/comments/commentCreatedBy';
import { commentParentToJsonb } from '@/lib/comments/commentParent';
import { DEFAULT_PLANNER_COMMENT_CARD_ROW_HEIGHT } from '@/lib/comments/plannerCommentCardRow';
import { DEFAULT_STICKY_NOTE_COLOR } from '@/lib/comments/stickyNoteColor';
import { query, runBeerTrackerTransaction } from '@/lib/db';
import { toPlannerCommentTaskId } from '@/lib/planner/plannerCardKind';

import { sprintTenantParams, sprintTenantWhere } from './sprintTenantSql';

export const SPRINT_COMMENT_RETURNING = `
        id,
        assignee_id,
        text,
        position_x AS x,
        position_y AS y,
        day,
        part,
        width,
        height,
        color,
        kind,
        parent,
        image_file_id,
        created_by,
        created_at,
        updated_at,
        updated_by,
        version,
        deleted_at,
        deleted_by,
        pending_approval,
        pending_approval_expires_at,
        plan_patch_proposal_id,
        client_brand,
        replaces_comment_id,
        replace_action`;

const COMMENT_RETURNING = SPRINT_COMMENT_RETURNING;

interface CommentAuthorNameRow {
  author_name: string | null;
  id: string;
}

interface CommentRowWithCreator {
  created_by?: string | null;
}

export async function withCommentAuthors<T extends CommentRowWithCreator>(
  rows: T[]
): Promise<Array<T & { author_name: string | null }>> {
  const ids = collectCommentAuthorIds(rows);
  if (ids.length === 0) {
    return mergeCommentAuthorNames(rows, {});
  }
  try {
    const result = await query<CommentAuthorNameRow>(
      `SELECT s.id::text AS id, ${STAFF_AUTHOR_DISPLAY_NAME_SQL} AS author_name
         FROM staff s
        WHERE s.id = ANY($1::uuid[])`,
      [ids]
    );
    const authorsById: Record<string, string | null> = {};
    for (const row of result.rows) {
      authorsById[row.id] = row.author_name;
    }
    return mergeCommentAuthorNames(rows, authorsById);
  } catch (error) {
    console.error('Error resolving comment authors:', error);
    return mergeCommentAuthorNames(rows, {});
  }
}

export async function listSprintComments(input: {
  organizationId: string;
  sprintId: number;
  /**
   * Кто смотрит: черновые заметки агента (pending_approval) приватны — видны только автору драфта.
   * Без viewer черновики не возвращаются никому.
   */
  viewerUserId?: string;
}): Promise<unknown[]> {
  await deleteExpiredPendingSprintComments({ sprintId: input.sprintId });
  const result = await query(
    `SELECT ${COMMENT_RETURNING}
      FROM comments
      WHERE ${sprintTenantWhere()}
        AND deleted_at IS NULL
        AND (pending_approval = FALSE OR LOWER(created_by::text) = LOWER($2))
      ORDER BY created_at`,
    [...sprintTenantParams(input.sprintId), input.viewerUserId ?? '']
  );
  return withCommentAuthors(result.rows as CommentRowWithCreator[]);
}

export async function listSprintCommentIds(
  input: {
   sprintId: number
  },
  run: BeerTrackerTransactionQuery = query
): Promise<string[]> {
  const result = await run(
    `SELECT id FROM comments
      WHERE ${sprintTenantWhere()}
        AND deleted_at IS NULL`,
    sprintTenantParams(input.sprintId)
  );
  return result.rows.map((row) => String((row as { id: string }).id));
}

export async function sprintCommentExists(
  input: {
    commentId: string;
    sprintId: number;
  },
  run: BeerTrackerTransactionQuery = query
): Promise<boolean> {
  const result = await run(
    `SELECT 1 FROM comments
      WHERE ${sprintTenantWhere()}
        AND id = $2
        AND deleted_at IS NULL
      LIMIT 1`,
    [...sprintTenantParams(input.sprintId), input.commentId]
  );
  return result.rows.length > 0;
}

export async function insertSprintComment(
  input: {
    assigneeId: string;
    color?: string | null;
    commentId: string | undefined;
    createdBy?: string | null;
    day: number | null | undefined;
    height: number | undefined;
    organizationId: string;
    part: number | null | undefined;
    sprintId: number;
    text: string;
    width: number | undefined;
    x: number | null | undefined;
    y: number | null | undefined;
    imageFileId?: string | null;
    kind?: 'diagram' | 'image' | 'text' | 'widget';
    parent?: TaskParent | null;
    clientBrand?: string | null;
    pendingApproval?: boolean;
    pendingApprovalExpiresAt?: Date | string | null;
    planPatchProposalId?: string | null;
  },
  run: BeerTrackerTransactionQuery = query
): Promise<unknown> {
  const color = input.color ?? DEFAULT_STICKY_NOTE_COLOR;
  const kind = input.kind ?? 'text';
  const imageFileId = input.imageFileId ?? null;
  const result = await run(
    insertSprintCommentSql(),
    insertSprintCommentParams(input, color, kind, imageFileId)
  );
  const inserted = result.rows[0] as CommentRowWithCreator | undefined;
  const row =
    inserted ??
    (input.commentId
      ? await loadSprintCommentRow(
          {
            commentId: input.commentId,
            organizationId: input.organizationId,
            sprintId: input.sprintId,
          },
          run
        )
      : undefined);
  if (!row) {
    return undefined;
  }
  const [withAuthor] = await withCommentAuthors([row]);
  return withAuthor;
}

export function insertSprintCommentSql(): string {
  return `INSERT INTO comments (
             id, organization_id, sprint_id, assignee_id, text,
             position_x, position_y, day, part, width, height, color, created_by, kind, image_file_id, parent,
             pending_approval, pending_approval_expires_at, plan_patch_proposal_id, client_brand
           ) VALUES (
             COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb,
             $17, $18, $19, $20
           )
           ON CONFLICT (id) DO NOTHING
           RETURNING ${COMMENT_RETURNING}`;
}

function insertSprintCommentParams(
  input: {
    assigneeId: string;
    commentId: string | undefined;
    createdBy?: string | null;
    day: number | null | undefined;
    height: number | undefined;
    organizationId: string;
    part: number | null | undefined;
    sprintId: number;
    text: string;
    width: number | undefined;
    x: number | null | undefined;
    y: number | null | undefined;
    clientBrand?: string | null;
    parent?: TaskParent | null;
    pendingApproval?: boolean;
    pendingApprovalExpiresAt?: Date | string | null;
    planPatchProposalId?: string | null;
  },
  color: string,
  kind: 'diagram' | 'image' | 'text' | 'widget',
  imageFileId: string | null
): QueryParams {
  return [
    input.commentId,
    input.organizationId,
    input.sprintId,
    input.assigneeId,
    input.text,
    input.x ?? null,
    input.y ?? null,
    input.day ?? null,
    input.part ?? null,
    input.width ?? 200,
    input.height ?? DEFAULT_PLANNER_COMMENT_CARD_ROW_HEIGHT,
    color,
    resolveCommentCreatedBy(input.createdBy),
    kind,
    imageFileId,
    commentParentToJsonb(input.parent ?? null),
    input.pendingApproval === true,
    input.pendingApprovalExpiresAt ?? null,
    input.planPatchProposalId ?? null,
    input.clientBrand ?? '',
  ];
}

async function loadSprintCommentRow(
  input: {
    commentId: string;
    organizationId: string;
    sprintId: number;
  },
  run: BeerTrackerTransactionQuery = query
): Promise<CommentRowWithCreator | undefined> {
  const result = await run(
    `SELECT ${COMMENT_RETURNING}
       FROM comments
      WHERE ${sprintTenantWhere()}
        AND id = $2
        AND deleted_at IS NULL
      LIMIT 1`,
    [...sprintTenantParams(input.sprintId), input.commentId]
  );
  return result.rows[0] as CommentRowWithCreator | undefined;
}

export async function getSprintCommentText(input: {
  commentId: string;
  organizationId: string;
  sprintId: number;
}): Promise<string | null> {
  const row = await loadSprintCommentRow(input);
  const text = (row as { text?: string } | undefined)?.text;
  return typeof text === 'string' ? text : null;
}

export function updateSprintCommentSql(): string {
  return `UPDATE comments SET
        text = COALESCE($1, text),
        position_x = COALESCE($2, position_x),
        position_y = COALESCE($3, position_y),
        width = COALESCE($4, width),
        height = COALESCE($5, height),
        assignee_id = COALESCE($6, assignee_id),
        day = COALESCE($7, day),
        part = COALESCE($8, part),
        color = COALESCE($9, color),
        parent = CASE WHEN $10 THEN $11::jsonb ELSE parent END,
        updated_by = COALESCE($12, updated_by),
        version = version + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE sprint_id = $13
        AND id = $14
        AND deleted_at IS NULL
        AND ($15::int IS NULL OR version = $15)
      RETURNING ${COMMENT_RETURNING}`;
}

function updateSprintCommentParams(input: {
  assigneeId: unknown;
  color: unknown;
  commentId: string;
  day: unknown;
  height: unknown;
  ifVersion?: number | null;
  organizationId: string;
  parent: TaskParent | null;
  parentProvided: boolean;
  part: unknown;
  sprintId: number;
  text: unknown;
  updatedBy?: string | null;
  width: unknown;
  x: unknown;
  y: unknown;
}): QueryParams {
  return [
    input.text,
    input.x,
    input.y,
    input.width,
    input.height,
    input.assigneeId,
    input.day ?? null,
    input.part ?? null,
    input.color ?? null,
    input.parentProvided,
    commentParentToJsonb(input.parent),
    input.updatedBy ?? null,
    input.sprintId,
    input.commentId,
    input.ifVersion ?? null,
  ] as QueryParams;
}

export async function updateSprintComment(
  input: {
    assigneeId: unknown;
    color: unknown;
    commentId: string;
    day: unknown;
    height: unknown;
    ifVersion?: number | null;
    organizationId: string;
    parent?: TaskParent | null;
    parentProvided?: boolean;
    part: unknown;
    sprintId: number;
    text: unknown;
    updatedBy?: string | null;
    width: unknown;
    x: unknown;
    y: unknown;
  },
  run: BeerTrackerTransactionQuery = query
): Promise<{ conflict?: boolean; row: unknown | null }> {
  const result = await run(
    updateSprintCommentSql(),
    updateSprintCommentParams({
      ...input,
      parent: input.parent ?? null,
      parentProvided: input.parentProvided === true,
    })
  );
  const row = (result.rows[0] as CommentRowWithCreator | undefined) ?? null;
  if (!row) {
    if (input.ifVersion != null) {
      const stillThere = await sprintCommentExists(
        {
          commentId: input.commentId,
          sprintId: input.sprintId,
        },
        run
      );
      if (stillThere) {
        return { conflict: true, row: null };
      }
    }
    return { row: null };
  }
  const [withAuthor] = await withCommentAuthors([row]);
  return { row: withAuthor };
}

/** Оба написания конца стрелки к заметке: сырой uuid (MCP) и `comment:{uuid}` (доска). */
export function sprintCommentLinkEndpoints(commentIds: readonly string[]): string[] {
  return commentIds.flatMap((id) => [id, toPlannerCommentTaskId(id)]);
}

/** Стрелки спринта, у которых хотя бы один конец — одна из заметок ($2 — концы обоих написаний). */
export function deleteSprintCommentLinksSql(): string {
  return `DELETE FROM task_links
    WHERE sprint_id = $1
      AND (from_task_id = ANY($2::text[]) OR to_task_id = ANY($2::text[]))`;
}

export function softDeleteSprintCommentSql(): string {
  return `UPDATE comments SET
        deleted_at = CURRENT_TIMESTAMP,
        deleted_by = $3::uuid,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = COALESCE($3::uuid, updated_by),
        version = version + 1
      WHERE sprint_id = $1
        AND id = $2
        AND deleted_at IS NULL
        AND (pending_approval = FALSE OR created_by = $3::uuid)
      RETURNING id`;
}

/**
 * Мягко удаляет заметку и одной транзакцией — стрелки к ней (task_links в Postgres хранят
 * только связи с участием заметки). Файлы фото/схемы в S3 и planner_files не трогаем: строка
 * остаётся с deleted_at.
 */
async function softDeleteSprintCommentWithLinks(
  input: { actorUserId?: string | null; commentId: string; sprintId: number },
  tx: BeerTrackerTransactionQuery
): Promise<{ ok: boolean }> {
  const result = await tx(softDeleteSprintCommentSql(), [
    input.sprintId,
    input.commentId,
    input.actorUserId ?? null,
  ]);
  if ((result.rowCount ?? 0) === 0) {
    return { ok: false };
  }
  await tx(deleteSprintCommentLinksSql(), [
    input.sprintId,
    sprintCommentLinkEndpoints([input.commentId]),
  ]);
  return { ok: true };
}

/** Мягко удаляет заметку и её стрелки — в своей транзакции или во внешней (`tx`). */
export function deleteSprintComment(
  input: {
    actorUserId?: string | null;
    commentId: string;
    organizationId: string;
    sprintId: number;
  },
  tx?: BeerTrackerTransactionQuery
): Promise<{ ok: boolean }> {
  if (tx) {
    return softDeleteSprintCommentWithLinks(input, tx);
  }
  return runBeerTrackerTransaction((own) => softDeleteSprintCommentWithLinks(input, own));
}

async function deleteExpiredPendingSprintComments(input: {
  sprintId: number;
}): Promise<number> {
  const result = await query(
    `DELETE FROM comments
      WHERE ${sprintTenantWhere()}
        AND pending_approval = TRUE
        AND pending_approval_expires_at IS NOT NULL
        AND pending_approval_expires_at < CURRENT_TIMESTAMP`,
    sprintTenantParams(input.sprintId)
  );
  return result.rowCount ?? 0;
}

export function moveSprintCommentsSql(): string {
  return 'UPDATE comments SET sprint_id = $2 WHERE sprint_id = $1 AND id = ANY($3::uuid[])';
}
