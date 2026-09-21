import { query } from '@/lib/db';

import { parseFeatureLanesDocument, type FeatureLanesDocument } from './featureLanesDocument';
import { sprintTenantParams, sprintTenantWhere } from './sprintTenantSql';

export async function fetchFeatureLanes(input: {
  organizationId: string;
  sprintId: number;
}): Promise<FeatureLanesDocument | null> {
  const result = await query(
    `SELECT draft_rows as "draftRows", hidden_ids as "hiddenIds", order_ids as "orderIds"
       FROM sprint_feature_lanes
       WHERE ${sprintTenantWhere()}`,
    sprintTenantParams(input.sprintId)
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return parseFeatureLanesDocument(row);
}

export function upsertFeatureLanesSql(): string {
  return `INSERT INTO sprint_feature_lanes (organization_id, sprint_id, draft_rows, order_ids, hidden_ids)
           VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb)
           ON CONFLICT (organization_id, sprint_id)
           DO UPDATE SET draft_rows = $3::jsonb, order_ids = $4::jsonb, hidden_ids = $5::jsonb,
                         updated_at = CURRENT_TIMESTAMP`;
}

export async function upsertFeatureLanes(input: {
  lanes: FeatureLanesDocument;
  organizationId: string;
  sprintId: number;
}): Promise<void> {
  const lanes = parseFeatureLanesDocument(input.lanes);
  await query(upsertFeatureLanesSql(), [
    input.organizationId,
    input.sprintId,
    JSON.stringify(lanes.draftRows),
    JSON.stringify(lanes.orderIds),
    JSON.stringify(lanes.hiddenIds),
  ]);
}
