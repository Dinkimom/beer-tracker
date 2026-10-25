import type { BeerTrackerTransactionQuery } from '@/lib/db';

import { createHash } from 'crypto';

import { query } from '@/lib/db';
import { getBeerTrackerSchema } from '@/lib/env';

let schemaEnsured = false;
let schemaEnsurePromise: Promise<void> | null = null;

function qualifySchemaName(schema: string): string {
  return schema.includes('-') ? `"${schema}"` : schema;
}

async function runEnsurePlanPatchAppliedTokensSchema(): Promise<void> {
  try {
    const schema = qualifySchemaName(getBeerTrackerSchema());
    await query(`
      CREATE TABLE IF NOT EXISTS ${schema}.plan_patch_applied_tokens (
        organization_id UUID NOT NULL REFERENCES ${schema}.organizations (id) ON DELETE CASCADE,
        token_hash CHAR(64) NOT NULL,
        sprint_id INTEGER NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY (organization_id, token_hash)
      )
    `);
    schemaEnsured = true;
  } catch (error) {
    schemaEnsurePromise = null;
    throw error;
  }
}

/** Таблица применённых токенов plan patch (runtime-DDL, см. docs/DATABASE.md). */
export async function ensurePlanPatchAppliedTokensSchema(): Promise<void> {
  if (schemaEnsured) {
    return;
  }
  schemaEnsurePromise ??= runEnsurePlanPatchAppliedTokensSchema();
  await schemaEnsurePromise;
}

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
