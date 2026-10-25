import type { BeerTrackerTransactionQuery } from '@/lib/db';

import { createHash } from 'crypto';

function hashPlanPatchApplyToken(applyToken: string): string {
  return createHash('sha256').update(applyToken).digest('hex');
}

/**
 * Забирает токен в транзакции применения. `false` — токен уже применён (в том числе
 * параллельным запросом: вставка ждёт его коммита). Откат транзакции освобождает токен.
 */
export async function claimPlanPatchApplyToken(
  input: { applyToken: string; expiresAtSec: number; organizationId: string; sprintId: number },
  tx: BeerTrackerTransactionQuery
): Promise<boolean> {
  await tx('DELETE FROM plan_patch_applied_tokens WHERE expires_at < CURRENT_TIMESTAMP');
  const result = await tx(
    `INSERT INTO plan_patch_applied_tokens (organization_id, token_hash, sprint_id, expires_at)
     VALUES ($1, $2, $3, to_timestamp($4))
     ON CONFLICT (organization_id, token_hash) DO NOTHING
     RETURNING token_hash`,
    [input.organizationId, hashPlanPatchApplyToken(input.applyToken), input.sprintId, input.expiresAtSec]
  );
  return (result.rowCount ?? 0) > 0;
}
