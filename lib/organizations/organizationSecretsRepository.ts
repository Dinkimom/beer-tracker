/**
 * Чтение organization_secrets (серверный токен трекера).
 */

import { parseOrgTrackerSecretPayload } from '@/lib/atlassianOAuth/orgSecretPayload';
import { decryptOrgTrackerToken, encryptOrgTrackerToken } from '@/lib/crypto-org-secrets';
import { pool, qualifyBeerTrackerTables, query } from '@/lib/db';
import { getOrgSecretsMasterKey } from '@/lib/env';

interface OrganizationSecretRow {
  encrypted_tracker_token: Buffer;
  encryption_key_version: number;
}

const SELECT_SECRET_SQL = `SELECT encrypted_tracker_token, encryption_key_version
     FROM organization_secrets
     WHERE organization_id = $1`;

export async function findOrganizationSecretRow(
  organizationId: string
): Promise<OrganizationSecretRow | null> {
  const res = await query<OrganizationSecretRow>(SELECT_SECRET_SQL, [organizationId]);
  return res.rows[0] ?? null;
}

function decryptOrganizationSecretRow(row: OrganizationSecretRow): string {
  if (row.encryption_key_version !== 1) {
    throw new Error(
      `Unsupported organization_secrets.encryption_key_version: ${row.encryption_key_version}`
    );
  }
  const buf = Buffer.isBuffer(row.encrypted_tracker_token)
    ? row.encrypted_tracker_token
    : Buffer.from(row.encrypted_tracker_token);
  return decryptOrgTrackerToken(buf, getOrgSecretsMasterKey());
}

/** Raw decrypted secret (bare token or OAuth JSON). */
export async function getDecryptedOrganizationTrackerSecretRaw(
  organizationId: string
): Promise<string | null> {
  const row = await findOrganizationSecretRow(organizationId);
  return row ? decryptOrganizationSecretRow(row) : null;
}

/**
 * Расшифровывает OAuth-токен трекера для организации (access token).
 * Поддерживается только encryption_key_version === 1 (ротация — позже).
 */
export async function getDecryptedOrganizationTrackerToken(
  organizationId: string
): Promise<string | null> {
  const raw = await getDecryptedOrganizationTrackerSecretRaw(organizationId);
  if (!raw) {
    return null;
  }
  return parseOrgTrackerSecretPayload(raw).accessToken || null;
}

/**
 * Read-modify-write секрета под `SELECT … FOR UPDATE`: строка заблокирована и для app, и для
 * sync-worker, поэтому ротируемый refresh token Atlassian обменивается ровно один раз.
 * `next: null` — секрет не меняется. Нет строки — `null` без вызова `update`.
 */
export async function updateOrganizationTrackerSecretLocked<T>(
  organizationId: string,
  update: (raw: string) => Promise<{ next: string | null; result: T }>
): Promise<T | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query<OrganizationSecretRow>(
      qualifyBeerTrackerTables(`${SELECT_SECRET_SQL} FOR UPDATE`),
      [organizationId]
    );
    const row = res.rows[0];
    if (!row) {
      await client.query('COMMIT');
      return null;
    }
    const { next, result } = await update(decryptOrganizationSecretRow(row));
    if (next != null) {
      await client.query(
        qualifyBeerTrackerTables(
          `UPDATE organization_secrets
           SET encrypted_tracker_token = $2,
               encryption_key_version = 1,
               updated_at = CURRENT_TIMESTAMP
           WHERE organization_id = $1`
        ),
        [organizationId, encryptOrgTrackerToken(next, getOrgSecretsMasterKey())]
      );
    }
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}
