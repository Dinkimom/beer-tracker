import type { PlanPatchGoalPreview } from '@/lib/sprints/sprintPlanPatchGoalPreview';

import { query, runBeerTrackerTransaction } from '@/lib/db';
import { getBeerTrackerSchema } from '@/lib/env';
import { planPatchClientBrandFromUnknown } from '@/lib/sprints/sprintPlanPatchPositionPreview';

interface PreviewRow {
  action: string;
  client_brand: string;
  done: boolean;
  goal_id: string;
  goal_type: string;
  text: string;
}

let schemaEnsured = false;
let schemaEnsurePromise: Promise<void> | null = null;

function qualifySchemaName(schema: string): string {
  return schema.includes('-') ? `"${schema}"` : schema;
}

async function ensurePlanPatchGoalPreviewSchema(): Promise<void> {
  if (schemaEnsured) {
    return;
  }
  schemaEnsurePromise ??= runEnsurePlanPatchGoalPreviewSchema();
  await schemaEnsurePromise;
}

async function runEnsurePlanPatchGoalPreviewSchema(): Promise<void> {
  try {
    const schema = qualifySchemaName(getBeerTrackerSchema());
    await query(`
      CREATE TABLE IF NOT EXISTS ${schema}.plan_patch_goal_previews (
        organization_id UUID NOT NULL REFERENCES ${schema}.organizations (id) ON DELETE CASCADE,
        sprint_id INTEGER NOT NULL,
        goal_id UUID NOT NULL,
        proposal_id VARCHAR(64) NOT NULL,
        goal_type VARCHAR(16) NOT NULL CHECK (goal_type IN ('delivery', 'discovery')),
        action VARCHAR(16) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
        text TEXT NOT NULL,
        done BOOLEAN NOT NULL DEFAULT FALSE,
        client_brand VARCHAR(16) NOT NULL DEFAULT '',
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY (organization_id, sprint_id, goal_id)
      )
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_plan_patch_goal_previews_sprint
        ON ${schema}.plan_patch_goal_previews (organization_id, sprint_id)
    `);
    schemaEnsured = true;
  } catch (error) {
    schemaEnsurePromise = null;
    throw error;
  }
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
  sprintId: number;
}): Promise<PlanPatchGoalPreview[]> {
  await ensurePlanPatchGoalPreviewSchema();
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
       AND ($3::text IS NULL OR goal_type = $3)`,
    [input.organizationId, input.sprintId, input.goalType ?? null]
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
  sprintId: number;
}): Promise<{ count: number; proposalId: string } | null> {
  await ensurePlanPatchGoalPreviewSchema();
  await query(
    `DELETE FROM plan_patch_goal_previews
     WHERE organization_id = $1::uuid AND sprint_id = $2 AND expires_at < CURRENT_TIMESTAMP`,
    [input.organizationId, input.sprintId]
  );
  const result = await query<{ count: string; proposal_id: string }>(
    `SELECT proposal_id, COUNT(*)::text AS count
     FROM plan_patch_goal_previews
     WHERE organization_id = $1::uuid AND sprint_id = $2
     GROUP BY proposal_id
     ORDER BY COUNT(*) DESC
     LIMIT 1`,
    [input.organizationId, input.sprintId]
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
  previews: readonly PlanPatchGoalPreview[];
  proposalId: string;
  sprintId: number;
}): Promise<void> {
  await ensurePlanPatchGoalPreviewSchema();
  await runBeerTrackerTransaction(async (tx) => {
    // Полная замена: повторный propose с другим opsHash убирает старые превью целей
    // (createGoal каждый раз даёт новый goal_id — иначе они копятся).
    await tx(
      `DELETE FROM plan_patch_goal_previews
       WHERE organization_id = $1::uuid AND sprint_id = $2`,
      [input.organizationId, input.sprintId]
    );
    for (const preview of input.previews) {
      await tx(
        `INSERT INTO plan_patch_goal_previews (
           organization_id, sprint_id, goal_id, proposal_id, goal_type,
           action, text, done, client_brand, expires_at
         )
         VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (organization_id, sprint_id, goal_id) DO UPDATE
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
        ]
      );
    }
  });
}

export async function deletePlanPatchGoalPreviews(input: {
  goalId?: string;
  organizationId: string;
  sprintId: number;
}): Promise<number> {
  await ensurePlanPatchGoalPreviewSchema();
  const result = await query(
    `DELETE FROM plan_patch_goal_previews
     WHERE organization_id = $1::uuid
       AND sprint_id = $2
       AND ($3::uuid IS NULL OR goal_id = $3::uuid)`,
    [input.organizationId, input.sprintId, input.goalId ?? null]
  );
  return result.rowCount ?? 0;
}

export async function deletePlanPatchGoalPreviewsByProposal(input: {
  organizationId: string;
  proposalId: string;
  sprintId: number;
}): Promise<void> {
  await ensurePlanPatchGoalPreviewSchema();
  await query(
    `DELETE FROM plan_patch_goal_previews
     WHERE organization_id = $1::uuid AND sprint_id = $2 AND proposal_id = $3`,
    [input.organizationId, input.sprintId, input.proposalId]
  );
}
