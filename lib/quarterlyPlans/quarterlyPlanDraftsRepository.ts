import type { QuarterRef } from './quarterlyPlanTypes';

import { query } from '@/lib/db';

/** Черновик агента для квартального плана: пакет операций на версии плана `baseVersion`. */
interface QuarterlyPlanDraftRow {
  baseVersion: number;
  createdAt: string;
  ops: unknown;
  proposalId: string;
  summary: string;
}

interface DraftKey {
  organizationId: string;
  ownerId: string;
  ref: QuarterRef;
}

/** Черновик человека в квартале; null — черновика нет. */
export async function findQuarterlyPlanDraft({ organizationId, ownerId, ref }: DraftKey): Promise<QuarterlyPlanDraftRow | null> {
  const result = await query<{
    base_version: number;
    created_at: Date | string;
    ops: unknown;
    proposal_id: string;
    summary: string;
  }>(
    `SELECT proposal_id, base_version, ops, summary, created_at
       FROM org_quarterly_plan_drafts
      WHERE organization_id = $1 AND year = $2 AND quarter = $3 AND LOWER(owner_id) = LOWER($4)`,
    [organizationId, ref.year, ref.quarter, ownerId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    baseVersion: row.base_version,
    createdAt: new Date(row.created_at).toISOString(),
    ops: row.ops,
    proposalId: row.proposal_id,
    summary: row.summary,
  };
}

/** Кладёт черновик, заменяя прежний черновик этого человека в квартале. */
export async function saveQuarterlyPlanDraft(
  key: DraftKey & { baseVersion: number; ops: unknown; proposalId: string; summary: string }
): Promise<void> {
  await query(
    `INSERT INTO org_quarterly_plan_drafts (organization_id, year, quarter, owner_id, proposal_id, base_version, ops, summary)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
     ON CONFLICT (organization_id, year, quarter, owner_id) DO UPDATE
       SET proposal_id = EXCLUDED.proposal_id, base_version = EXCLUDED.base_version, ops = EXCLUDED.ops,
           summary = EXCLUDED.summary, created_at = CURRENT_TIMESTAMP`,
    [key.organizationId, key.ref.year, key.ref.quarter, key.ownerId, key.proposalId, key.baseVersion, JSON.stringify(key.ops), key.summary]
  );
}

/** Убирает черновик (принят или отклонён). `proposalId` — только эту версию: чтобы не снести новый драфт. */
export async function deleteQuarterlyPlanDraft(key: DraftKey & { proposalId?: string }): Promise<boolean> {
  const result = await query(
    `DELETE FROM org_quarterly_plan_drafts
      WHERE organization_id = $1 AND year = $2 AND quarter = $3 AND LOWER(owner_id) = LOWER($4)
        AND ($5::varchar IS NULL OR proposal_id = $5)`,
    [key.organizationId, key.ref.year, key.ref.quarter, key.ownerId, key.proposalId ?? null]
  );
  return (result.rowCount ?? 0) > 0;
}
