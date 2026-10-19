import { query } from '@/lib/db';

import { ensurePlannerCommentImagesSchema } from './ensurePlannerCommentImages';
import { sprintTenantParams, sprintTenantWhere } from './sprintTenantSql';

/** Число pending-заметок plan patch в спринте (ещё не apply / не истекли). */
export async function countPendingPlanPatchSprintComments(input: {
  sprintId: number;
}): Promise<number> {
  await ensurePlannerCommentImagesSchema();
  const result = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM comments
      WHERE ${sprintTenantWhere()}
        AND pending_approval = TRUE
        AND plan_patch_proposal_id IS NOT NULL
        AND (pending_approval_expires_at IS NULL OR pending_approval_expires_at >= CURRENT_TIMESTAMP)`,
    sprintTenantParams(input.sprintId)
  );
  return Number(result.rows[0]?.count ?? 0);
}

/** Полный opsHash из первой pending-заметки (proposal id в notes = hash, не short id). */
export async function peekPendingPlanPatchCommentProposalId(input: {
  sprintId: number;
}): Promise<string | null> {
  await ensurePlannerCommentImagesSchema();
  const result = await query<{ plan_patch_proposal_id: string }>(
    `SELECT plan_patch_proposal_id
       FROM comments
      WHERE ${sprintTenantWhere()}
        AND pending_approval = TRUE
        AND plan_patch_proposal_id IS NOT NULL
        AND (pending_approval_expires_at IS NULL OR pending_approval_expires_at >= CURRENT_TIMESTAMP)
      ORDER BY updated_at DESC
      LIMIT 1`,
    sprintTenantParams(input.sprintId)
  );
  const value = result.rows[0]?.plan_patch_proposal_id?.trim();
  return value || null;
}
