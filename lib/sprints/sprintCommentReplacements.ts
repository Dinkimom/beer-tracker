import type { SprintPlanPatchOp } from '@/lib/sprints/sprintPlanPatchTypes';
import type { QueryParams, TaskParent } from '@/types';

import { randomUUID } from 'crypto';

import { commentParentToJsonb } from '@/lib/comments/commentParent';
import { query } from '@/lib/db';

import { ensurePlannerCommentImagesSchema } from './ensurePlannerCommentImages';

/**
 * Правка или удаление заметки из propose_plan_patch — черновик-замена: копия заметки с новым
 * содержимым (pending_approval, видна только автору драфта) и ссылкой на оригинал.
 * На доске она полупрозрачная рядом с оригиналом; принять — перенести её в оригинал (или удалить
 * оригинал) и убрать копию, отклонить — убрать копию.
 */

type NoteChangeOp = Extract<SprintPlanPatchOp, { op: 'deleteNote' | 'updateNote' }>;

function collectNoteChangeOps(ops: readonly SprintPlanPatchOp[]): NoteChangeOp[] {
  return ops.filter((op): op is NoteChangeOp => op.op === 'updateNote' || op.op === 'deleteNote');
}

function asParent(parent: Extract<NoteChangeOp, { op: 'updateNote' }>['parent']): TaskParent | null {
  if (!parent) {
    return null;
  }
  return { display: parent.display, id: parent.id, key: parent.key, ...(parent.self ? { self: parent.self } : {}) };
}

/** Поля копии: что не задано в updateNote — из оригинала (те же значения, что записал бы apply). */
function replacementParams(op: NoteChangeOp): QueryParams {
  if (op.op === 'deleteNote') {
    return [null, null, false, null, false, null, null, null, null, false, null, 'delete'];
  }
  return [
    op.assigneeId ?? null,
    op.text ?? null,
    op.day !== undefined,
    op.day ?? null,
    op.part !== undefined,
    op.part ?? null,
    op.width ?? null,
    op.height ?? null,
    op.color ?? null,
    op.parent !== undefined,
    commentParentToJsonb(asParent(op.parent)),
    'update',
  ];
}

const INSERT_REPLACEMENT_SQL = `INSERT INTO comments (
     id, organization_id, sprint_id, assignee_id, text, position_x, position_y, day, part, width, height,
     color, created_by, kind, image_file_id, parent, pending_approval, pending_approval_expires_at,
     plan_patch_proposal_id, client_brand, replaces_comment_id, replace_action
   )
   SELECT $1::uuid, o.organization_id, o.sprint_id, COALESCE($7::varchar, o.assignee_id), COALESCE($8::text, o.text),
          o.position_x, o.position_y,
          CASE WHEN $9::boolean THEN $10::int ELSE o.day END,
          CASE WHEN $11::boolean THEN $12::int ELSE o.part END,
          COALESCE($13::int, o.width), COALESCE($14::int, o.height), COALESCE($15::varchar, o.color),
          $4::uuid, o.kind, o.image_file_id,
          CASE WHEN $16::boolean THEN $17::jsonb ELSE o.parent END,
          TRUE, $5::timestamptz, $6::varchar, $3::varchar, o.id, $18::varchar
     FROM comments o
    WHERE o.sprint_id = $2 AND o.id = $19::uuid AND o.deleted_at IS NULL AND o.pending_approval = FALSE`;

/** Черновики-замены для updateNote / deleteNote драфта; id созданных копий. */
export async function insertPendingCommentReplacements(input: {
  actorUserId: string;
  clientBrand?: string | null;
  expiresAt: Date;
  ops: readonly SprintPlanPatchOp[];
  proposalId: string;
  sprintId: number;
}): Promise<string[]> {
  await ensurePlannerCommentImagesSchema();
  const ids: string[] = [];
  for (const op of collectNoteChangeOps(input.ops)) {
    const id = randomUUID();
    const result = await query(INSERT_REPLACEMENT_SQL, [
      id,
      input.sprintId,
      input.clientBrand ?? '',
      input.actorUserId,
      input.expiresAt.toISOString(),
      input.proposalId,
      ...replacementParams(op),
      op.commentId,
    ]);
    if ((result.rowCount ?? 0) > 0) {
      ids.push(id);
    }
  }
  return ids;
}

const DRAFT_SCOPE = `d.sprint_id = $1
      AND d.pending_approval = TRUE
      AND d.replaces_comment_id IS NOT NULL
      AND ($2::uuid[] IS NULL OR d.id = ANY($2::uuid[]))
      AND ($3::text IS NULL OR LOWER(d.created_by::text) = LOWER($3))`;

const APPLY_REPLACEMENTS_SQL = `WITH drafts AS (
     SELECT d.* FROM comments d WHERE ${DRAFT_SCOPE}
   ),
   updated AS (
     UPDATE comments o
        SET text = d.text, color = d.color, day = d.day, part = d.part, width = d.width,
            height = d.height, assignee_id = d.assignee_id, parent = d.parent,
            updated_at = CURRENT_TIMESTAMP, updated_by = d.created_by, version = o.version + 1
       FROM drafts d
      WHERE d.replace_action = 'update' AND o.id = d.replaces_comment_id
        AND o.sprint_id = d.sprint_id AND o.deleted_at IS NULL
      RETURNING o.id
   ),
   removed AS (
     UPDATE comments o
        SET deleted_at = CURRENT_TIMESTAMP, deleted_by = d.created_by,
            updated_at = CURRENT_TIMESTAMP, updated_by = d.created_by, version = o.version + 1
       FROM drafts d
      WHERE d.replace_action = 'delete' AND o.id = d.replaces_comment_id
        AND o.sprint_id = d.sprint_id AND o.deleted_at IS NULL
      RETURNING o.id
   )
   DELETE FROM comments c USING drafts d WHERE c.id = d.id RETURNING c.id`;

/**
 * Принять черновики-замены: правка — в оригинал, удаление — удалить оригинал; копии убрать.
 * `commentIds` — какие копии (✓ на одной), `ownerId` — все копии автора драфта («Принять всё»).
 */
export async function applyPendingCommentReplacements(input: {
  commentIds?: readonly string[];
  ownerId?: string;
  sprintId: number;
}): Promise<number> {
  await ensurePlannerCommentImagesSchema();
  const result = await query(APPLY_REPLACEMENTS_SQL, [
    input.sprintId,
    input.commentIds ? [...input.commentIds] : null,
    input.ownerId ?? null,
  ]);
  return result.rowCount ?? 0;
}

/** apply_plan_patch сам применил updateNote / deleteNote — копии на доске больше не нужны. */
export async function deletePendingCommentReplacements(input: { ownerId: string; sprintId: number }): Promise<void> {
  await ensurePlannerCommentImagesSchema();
  await query(`DELETE FROM comments d WHERE ${DRAFT_SCOPE}`, [input.sprintId, null, input.ownerId]);
}
