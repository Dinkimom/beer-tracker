import type { PlanPatchGoalPreview } from '@/lib/sprints/sprintPlanPatchGoalPreview';

import { query, runBeerTrackerTransaction } from '@/lib/db';
import { planPatchClientBrandFromUnknown } from '@/lib/sprints/sprintPlanPatchPositionPreview';

interface PreviewRow {
  action: string;
  client_brand: string;
  done: boolean;
  goal_id: string;
  goal_type: string;
  text: string;
}

function previewFromRow(row: PreviewRow): PlanPatchGoalPreview | null {
  if (row.action !== 'create' && row.action !== 'delete' && row.action !== 'update') {
    return null;
  }
  if (row.goal_type !== 'delivery' && row.goal_type !== 'discovery') {
    return null;
  }
  const clientBrand = planPatchClientBrandFromUnknown(row.client_brand);
  return {
    action: row.action,
    ...(clientBrand ? { clientBrand } : {}),
    done: row.done === true,
    goalId: row.goal_id,
    goalType: row.goal_type,
    text: row.text,
  };
}

export async function listPlanPatchGoalPreviews(input: {
  goalType?: string;
  organizationId: string;
  /** Владелец драфта: драфты приватны, чужие не возвращаются. */
  ownerId: string;
  sprintId: number;
}): Promise<PlanPatchGoalPreview[]> {
  await query(
    `DELETE FROM plan_patch_goal_previews
     WHERE organization_id = $1::uuid AND sprint_id = $2 AND expires_at < CURRENT_TIMESTAMP`,
    [input.organizationId, input.sprintId]
  );
  const result = await query<PreviewRow>(
    `SELECT goal_id, goal_type, action, text, done, client_brand
     FROM plan_patch_goal_previews
     WHERE organization_id = $1::uuid
       AND sprint_id = $2
       AND owner_id = $4
       AND ($3::text IS NULL OR goal_type = $3)`,
    [input.organizationId, input.sprintId, input.goalType ?? null, input.ownerId]
  );
  const previews: PlanPatchGoalPreview[] = [];
  for (const row of result.rows) {
    const preview = previewFromRow(row);
    if (preview) {
      previews.push(preview);
    }
  }
  return previews;
}

/** Short proposal id + row count for unexpired goal previews (if any). */
export async function peekPlanPatchGoalPreviewProposal(input: {
  organizationId: string;
  ownerId: string;
  sprintId: number;
}): Promise<{ count: number; proposalId: string } | null> {
  await query(
    `DELETE FROM plan_patch_goal_previews
     WHERE organization_id = $1::uuid AND sprint_id = $2 AND expires_at < CURRENT_TIMESTAMP`,
    [input.organizationId, input.sprintId]
  );
  const result = await query<{ count: string; proposal_id: string }>(
    `SELECT proposal_id, COUNT(*)::text AS count
     FROM plan_patch_goal_previews
     WHERE organization_id = $1::uuid AND sprint_id = $2 AND owner_id = $3
     GROUP BY proposal_id
     ORDER BY COUNT(*) DESC
     LIMIT 1`,
    [input.organizationId, input.sprintId, input.ownerId]
  );
  const row = result.rows[0];
  if (!row?.proposal_id) {
    return null;
  }
  return { count: Number(row.count), proposalId: row.proposal_id };
}

export async function replacePlanPatchGoalPreviews(input: {
  expiresAt: Date;
  organizationId: string;
  ownerId: string;
  previews: readonly PlanPatchGoalPreview[];
  proposalId: string;
  sprintId: number;
}): Promise<void> {
  await runBeerTrackerTransaction(async (tx) => {
    // Полная замена: повторный propose с другим opsHash убирает старые превью целей
    // (createGoal каждый раз даёт новый goal_id — иначе они копятся).
    await tx(
      `DELETE FROM plan_patch_goal_previews
       WHERE organization_id = $1::uuid AND sprint_id = $2 AND owner_id = $3`,
      [input.organizationId, input.sprintId, input.ownerId]
    );
    for (const preview of input.previews) {
      await tx(
        `INSERT INTO plan_patch_goal_previews (
           organization_id, sprint_id, goal_id, proposal_id, goal_type,
           action, text, done, client_brand, expires_at, owner_id
         )
         VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (organization_id, sprint_id, owner_id, goal_id) DO UPDATE
         SET proposal_id = EXCLUDED.proposal_id,
             goal_type = EXCLUDED.goal_type,
             action = EXCLUDED.action,
             text = EXCLUDED.text,
             done = EXCLUDED.done,
             client_brand = EXCLUDED.client_brand,
             expires_at = EXCLUDED.expires_at`,
        [
          input.organizationId,
          input.sprintId,
          preview.goalId,
          input.proposalId,
          preview.goalType,
          preview.action,
          preview.text,
          preview.done,
          preview.clientBrand ?? '',
          input.expiresAt.toISOString(),
          input.ownerId,
        ]
      );
    }
  });
}

export async function deletePlanPatchGoalPreviews(input: {
  goalId?: string;
  organizationId: string;
  ownerId: string;
  sprintId: number;
}): Promise<number> {
  const result = await query(
    `DELETE FROM plan_patch_goal_previews
     WHERE organization_id = $1::uuid
       AND sprint_id = $2
       AND owner_id = $4
       AND ($3::uuid IS NULL OR goal_id = $3::uuid)`,
    [input.organizationId, input.sprintId, input.goalId ?? null, input.ownerId]
  );
  return result.rowCount ?? 0;
}

export async function deletePlanPatchGoalPreviewsByProposal(input: {
  organizationId: string;
  ownerId: string;
  proposalId: string;
  sprintId: number;
}): Promise<void> {
  await query(
    `DELETE FROM plan_patch_goal_previews
     WHERE organization_id = $1::uuid AND sprint_id = $2 AND proposal_id = $3 AND owner_id = $4`,
    [input.organizationId, input.sprintId, input.proposalId, input.ownerId]
  );
}
