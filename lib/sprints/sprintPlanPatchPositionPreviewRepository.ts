import type { PlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';

import { query, runBeerTrackerTransaction } from '@/lib/db';
import { getBeerTrackerSchema } from '@/lib/env';

import { planPatchChangeLabelOrder, planPatchClientBrandFromUnknown } from './sprintPlanPatchPositionPreview';

interface PreviewRow {
  assignee_id: string;
  changes: string;
  client_brand: string;
  duration: number;
  remove: boolean;
  start_day: number;
  start_part: number;
  task_id: string;
}

let schemaEnsured = false;
let schemaEnsurePromise: Promise<void> | null = null;

function qualifySchemaName(schema: string): string {
  return schema.includes('-') ? `"${schema}"` : schema;
}

async function ensurePlanPatchPositionPreviewSchema(): Promise<void> {
  if (schemaEnsured) {
    return;
  }
  schemaEnsurePromise ??= runEnsurePlanPatchPositionPreviewSchema();
  await schemaEnsurePromise;
}

async function runEnsurePlanPatchPositionPreviewSchema(): Promise<void> {
  try {
    const schema = qualifySchemaName(getBeerTrackerSchema());
    await query(`
      CREATE TABLE IF NOT EXISTS ${schema}.plan_patch_position_previews (
        organization_id UUID NOT NULL REFERENCES ${schema}.organizations (id) ON DELETE CASCADE,
        sprint_id INTEGER NOT NULL,
        task_id VARCHAR(255) NOT NULL,
        proposal_id VARCHAR(64) NOT NULL,
        assignee_id VARCHAR(255) NOT NULL,
        start_day INTEGER NOT NULL CHECK (start_day >= 0 AND start_day < 400),
        start_part INTEGER NOT NULL CHECK (start_part >= 0 AND start_part < 4),
        duration INTEGER NOT NULL CHECK (duration > 0),
        remove BOOLEAN NOT NULL DEFAULT FALSE,
        changes TEXT NOT NULL DEFAULT '',
        client_brand VARCHAR(16) NOT NULL DEFAULT '',
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY (organization_id, sprint_id, task_id)
      )
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_plan_patch_position_previews_sprint
        ON ${schema}.plan_patch_position_previews (organization_id, sprint_id)
    `);
    await query(`
      ALTER TABLE ${schema}.plan_patch_position_previews
        ADD COLUMN IF NOT EXISTS client_brand VARCHAR(16) NOT NULL DEFAULT ''
    `);
    schemaEnsured = true;
  } catch (error) {
    schemaEnsurePromise = null;
    throw error;
  }
}

function changesFromRow(value: string): PlanPatchPositionPreview['changes'] {
  const changes: PlanPatchPositionPreview['changes'] = [];
  for (const part of value.split(',')) {
    if (part === 'schedule' || part === 'duration') {
      changes.push(part);
    }
  }
  return planPatchChangeLabelOrder(changes);
}

function previewFromRow(row: PreviewRow): PlanPatchPositionPreview {
  const clientBrand = planPatchClientBrandFromUnknown(row.client_brand);
  return {
    assigneeId: row.assignee_id,
    changes: changesFromRow(row.changes),
    ...(clientBrand ? { clientBrand } : {}),
    duration: row.duration,
    remove: row.remove === true,
    startDay: row.start_day,
    startPart: row.start_part,
    taskId: row.task_id,
  };
}

export async function listPlanPatchPositionPreviews(input: {
  organizationId: string;
  sprintId: number;
}): Promise<PlanPatchPositionPreview[]> {
  await ensurePlanPatchPositionPreviewSchema();
  await query(
    `DELETE FROM plan_patch_position_previews
     WHERE organization_id = $1::uuid AND sprint_id = $2 AND expires_at < CURRENT_TIMESTAMP`,
    [input.organizationId, input.sprintId]
  );
  const result = await query<PreviewRow>(
    `SELECT task_id, assignee_id, start_day, start_part, duration, remove, changes, client_brand
     FROM plan_patch_position_previews
     WHERE organization_id = $1::uuid AND sprint_id = $2`,
    [input.organizationId, input.sprintId]
  );
  return result.rows.map(previewFromRow);
}

export async function replacePlanPatchPositionPreviews(input: {
  expiresAt: Date;
  organizationId: string;
  previews: readonly PlanPatchPositionPreview[];
  proposalId: string;
  sprintId: number;
}): Promise<void> {
  await ensurePlanPatchPositionPreviewSchema();
  await runBeerTrackerTransaction(async (tx) => {
    await tx(
      `DELETE FROM plan_patch_position_previews
       WHERE organization_id = $1::uuid
         AND sprint_id = $2
         AND (expires_at < CURRENT_TIMESTAMP OR proposal_id = $3)`,
      [input.organizationId, input.sprintId, input.proposalId]
    );
    for (const preview of input.previews) {
      await tx(
        `INSERT INTO plan_patch_position_previews (
           organization_id, sprint_id, task_id, proposal_id, assignee_id,
           start_day, start_part, duration, remove, changes, client_brand, expires_at
         )
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (organization_id, sprint_id, task_id) DO UPDATE
         SET proposal_id = EXCLUDED.proposal_id,
             assignee_id = EXCLUDED.assignee_id,
             start_day = EXCLUDED.start_day,
             start_part = EXCLUDED.start_part,
             duration = EXCLUDED.duration,
             remove = EXCLUDED.remove,
             changes = EXCLUDED.changes,
             client_brand = EXCLUDED.client_brand,
             expires_at = EXCLUDED.expires_at`,
        [
          input.organizationId,
          input.sprintId,
          preview.taskId,
          input.proposalId,
          preview.assigneeId,
          preview.startDay,
          preview.startPart,
          preview.duration,
          preview.remove,
          preview.changes.join(','),
          preview.clientBrand ?? '',
          input.expiresAt.toISOString(),
        ]
      );
    }
  });
}

export async function deletePlanPatchPositionPreviews(input: {
  organizationId: string;
  sprintId: number;
  taskId?: string;
}): Promise<number> {
  await ensurePlanPatchPositionPreviewSchema();
  const result = await query(
    `DELETE FROM plan_patch_position_previews
     WHERE organization_id = $1::uuid
       AND sprint_id = $2
       AND ($3::text IS NULL OR task_id = $3)`,
    [input.organizationId, input.sprintId, input.taskId ?? null]
  );
  return result.rowCount ?? 0;
}

export async function deletePlanPatchPositionPreviewsByProposal(input: {
  organizationId: string;
  proposalId: string;
  sprintId: number;
}): Promise<void> {
  await ensurePlanPatchPositionPreviewSchema();
  await query(
    `DELETE FROM plan_patch_position_previews
     WHERE organization_id = $1::uuid AND sprint_id = $2 AND proposal_id = $3`,
    [input.organizationId, input.sprintId, input.proposalId]
  );
}
