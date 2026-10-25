import type { PlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';

import { query, runBeerTrackerTransaction } from '@/lib/db';

import {
  normalizePlanPatchPositionPreview,
  planPatchChangeLabelOrder,
  planPatchClientBrandFromUnknown,
} from './sprintPlanPatchPositionPreview';

interface PreviewRow {
  assignee_id: string;
  changes: string;
  client_brand: string;
  duration: number;
  remove: boolean;
  segments: unknown;
  start_day: number;
  start_part: number;
  sync_to_tracker: boolean;
  task_id: string;
}

function changesFromRow(value: string): PlanPatchPositionPreview['changes'] {
  const changes: PlanPatchPositionPreview['changes'] = [];
  for (const part of value.split(',')) {
    if (part === 'schedule' || part === 'duration' || part === 'segments') {
      changes.push(part);
    }
  }
  return planPatchChangeLabelOrder(changes);
}

function segmentsFromRow(value: unknown): PlanPatchPositionPreview['segments'] {
  if (value == null) {
    return undefined;
  }
  const normalized = normalizePlanPatchPositionPreview({
    assigneeId: 'x',
    duration: 1,
    segments: value,
    startDay: 0,
    startPart: 0,
    taskId: 'x',
  });
  return normalized?.segments;
}

function previewFromRow(row: PreviewRow): PlanPatchPositionPreview {
  const clientBrand = planPatchClientBrandFromUnknown(row.client_brand);
  const segments = segmentsFromRow(row.segments);
  return {
    assigneeId: row.assignee_id,
    changes: changesFromRow(row.changes),
    ...(clientBrand ? { clientBrand } : {}),
    duration: row.duration,
    remove: row.remove === true,
    ...(segments !== undefined ? { segments } : {}),
    startDay: row.start_day,
    startPart: row.start_part,
    ...(row.sync_to_tracker === true ? { syncToTracker: true } : {}),
    taskId: row.task_id,
  };
}

export async function listPlanPatchPositionPreviews(input: {
  organizationId: string;
  /** Владелец драфта: драфты приватны, чужие не возвращаются. */
  ownerId: string;
  sprintId: number;
}): Promise<PlanPatchPositionPreview[]> {
  await query(
    `DELETE FROM plan_patch_position_previews
     WHERE organization_id = $1::uuid AND sprint_id = $2 AND expires_at < CURRENT_TIMESTAMP`,
    [input.organizationId, input.sprintId]
  );
  const result = await query<PreviewRow>(
    `SELECT task_id, assignee_id, start_day, start_part, duration, remove, changes, client_brand, segments,
            sync_to_tracker
     FROM plan_patch_position_previews
     WHERE organization_id = $1::uuid AND sprint_id = $2 AND owner_id = $3`,
    [input.organizationId, input.sprintId, input.ownerId]
  );
  return result.rows.map(previewFromRow);
}

/** Short proposal id + row count for unexpired position previews (if any). */
export async function peekPlanPatchPositionPreviewProposal(input: {
  organizationId: string;
  ownerId: string;
  sprintId: number;
}): Promise<{ count: number; proposalId: string } | null> {
  await query(
    `DELETE FROM plan_patch_position_previews
     WHERE organization_id = $1::uuid AND sprint_id = $2 AND expires_at < CURRENT_TIMESTAMP`,
    [input.organizationId, input.sprintId]
  );
  const result = await query<{ count: string; proposal_id: string }>(
    `SELECT proposal_id, COUNT(*)::text AS count
     FROM plan_patch_position_previews
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

export async function replacePlanPatchPositionPreviews(input: {
  expiresAt: Date;
  organizationId: string;
  ownerId: string;
  previews: readonly PlanPatchPositionPreview[];
  proposalId: string;
  sprintId: number;
}): Promise<void> {
  await runBeerTrackerTransaction(async (tx) => {
    // Полная замена: повторный propose с другим opsHash должен снять старые карточки
    // (в т.ч. задачи, которых больше нет в ops), а не только строки с тем же proposal_id.
    await tx(
      `DELETE FROM plan_patch_position_previews
       WHERE organization_id = $1::uuid AND sprint_id = $2 AND owner_id = $3`,
      [input.organizationId, input.sprintId, input.ownerId]
    );
    for (const preview of input.previews) {
      await tx(
        `INSERT INTO plan_patch_position_previews (
           organization_id, sprint_id, task_id, proposal_id, assignee_id,
           start_day, start_part, duration, remove, changes, client_brand, segments, expires_at, owner_id,
           sync_to_tracker
         )
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15)
         ON CONFLICT (organization_id, sprint_id, owner_id, task_id) DO UPDATE
         SET proposal_id = EXCLUDED.proposal_id,
             assignee_id = EXCLUDED.assignee_id,
             start_day = EXCLUDED.start_day,
             start_part = EXCLUDED.start_part,
             duration = EXCLUDED.duration,
             remove = EXCLUDED.remove,
             changes = EXCLUDED.changes,
             client_brand = EXCLUDED.client_brand,
             segments = EXCLUDED.segments,
             sync_to_tracker = EXCLUDED.sync_to_tracker,
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
          preview.segments === undefined ? null : JSON.stringify(preview.segments),
          input.expiresAt.toISOString(),
          input.ownerId,
          preview.syncToTracker === true,
        ]
      );
    }
  });
}

/** Пользователь сдвинул карточку: новая геометрия, proposal/срок жизни не трогаем. */
export async function updatePlanPatchPositionPreviewGeometry(input: {
  organizationId: string;
  ownerId: string;
  preview: PlanPatchPositionPreview;
  sprintId: number;
}): Promise<number> {
  const { preview } = input;
  const result = await query(
    `UPDATE plan_patch_position_previews
     SET assignee_id = $5,
         start_day = $6,
         start_part = $7,
         duration = $8,
         changes = $9,
         segments = $10::jsonb
     WHERE organization_id = $1::uuid
       AND sprint_id = $2
       AND owner_id = $3
       AND task_id = $4
       AND remove = FALSE
       AND expires_at >= CURRENT_TIMESTAMP`,
    [
      input.organizationId,
      input.sprintId,
      input.ownerId,
      preview.taskId,
      preview.assigneeId,
      preview.startDay,
      preview.startPart,
      preview.duration,
      preview.changes.join(','),
      preview.segments === undefined ? null : JSON.stringify(preview.segments),
    ]
  );
  return result.rowCount ?? 0;
}

export async function deletePlanPatchPositionPreviews(input: {
  organizationId: string;
  ownerId: string;
  sprintId: number;
  taskId?: string;
}): Promise<number> {
  const result = await query(
    `DELETE FROM plan_patch_position_previews
     WHERE organization_id = $1::uuid
       AND sprint_id = $2
       AND owner_id = $4
       AND ($3::text IS NULL OR task_id = $3)`,
    [input.organizationId, input.sprintId, input.taskId ?? null, input.ownerId]
  );
  return result.rowCount ?? 0;
}

export async function deletePlanPatchPositionPreviewsByProposal(input: {
  organizationId: string;
  ownerId: string;
  proposalId: string;
  sprintId: number;
}): Promise<void> {
  await query(
    `DELETE FROM plan_patch_position_previews
     WHERE organization_id = $1::uuid AND sprint_id = $2 AND proposal_id = $3 AND owner_id = $4`,
    [input.organizationId, input.sprintId, input.proposalId, input.ownerId]
  );
}
