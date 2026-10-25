/**
 * Черновые заметки plan patch (pending approval): подтверждение и удаление.
 */

import type { BeerTrackerTransactionQuery } from '@/lib/db';

import { query } from '@/lib/db';

import { sprintTenantParams, sprintTenantWhere } from './sprintTenantSql';

/** Удаляет pending-заметки plan patch автора драфта в спринте (повторный propose / смена ops). */
export async function deletePendingPlanPatchSprintComments(input: {
  ownerId: string;
  sprintId: number;
}): Promise<number> {
  const result = await query(
    `DELETE FROM comments
      WHERE ${sprintTenantWhere()}
        AND pending_approval = TRUE
        AND plan_patch_proposal_id IS NOT NULL
        AND LOWER(created_by::text) = LOWER($2)`,
    [...sprintTenantParams(input.sprintId), input.ownerId]
  );
  return result.rowCount ?? 0;
}

/** `ownerId` — только черновики этого автора (✓ на доске); без него — системное подтверждение. */
export async function confirmPendingSprintComments(
  input: {
    commentIds: readonly string[];
    ownerId?: string;
    sprintId: number;
  },
  run: BeerTrackerTransactionQuery = query
): Promise<number> {
  if (input.commentIds.length === 0) {
    return 0;
  }
  const result = await run(
    `UPDATE comments
        SET pending_approval = FALSE,
            pending_approval_expires_at = NULL,
            plan_patch_proposal_id = NULL,
            client_brand = '',
            updated_at = CURRENT_TIMESTAMP
      WHERE ${sprintTenantWhere()}
        AND id = ANY($2::uuid[])
        AND pending_approval = TRUE
        AND ($3::text IS NULL OR LOWER(created_by::text) = LOWER($3))`,
    [...sprintTenantParams(input.sprintId), [...input.commentIds], input.ownerId ?? null]
  );
  return result.rowCount ?? 0;
}

/** Обычная (не черновая) заметка спринта существует. */
export async function hasConfirmedSprintComment(input: {
  commentId: string;
  sprintId: number;
}): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM comments
      WHERE ${sprintTenantWhere()}
        AND id = $2::uuid
        AND pending_approval = FALSE
        AND deleted_at IS NULL
      LIMIT 1`,
    [...sprintTenantParams(input.sprintId), input.commentId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function confirmAllPendingSprintComments(input: {
  ownerId: string;
  sprintId: number;
}): Promise<number> {
  const result = await query(
    `UPDATE comments
        SET pending_approval = FALSE,
            pending_approval_expires_at = NULL,
            plan_patch_proposal_id = NULL,
            client_brand = '',
            updated_at = CURRENT_TIMESTAMP
      WHERE ${sprintTenantWhere()}
        AND pending_approval = TRUE
        AND LOWER(created_by::text) = LOWER($2)`,
    [...sprintTenantParams(input.sprintId), input.ownerId]
  );
  return result.rowCount ?? 0;
}

export async function deleteAllPendingSprintComments(input: {
  ownerId: string;
  sprintId: number;
}): Promise<number> {
  const result = await query(
    `DELETE FROM comments
      WHERE ${sprintTenantWhere()}
        AND pending_approval = TRUE
        AND LOWER(created_by::text) = LOWER($2)`,
    [...sprintTenantParams(input.sprintId), input.ownerId]
  );
  return result.rowCount ?? 0;
}
