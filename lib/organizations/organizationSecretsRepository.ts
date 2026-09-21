/**
 * Чтение organization_secrets (серверный токен трекера).
 */

import { decryptOrgTrackerToken } from '@/lib/crypto-org-secrets';
import { query } from '@/lib/db';
import { getOrgSecretsMasterKey } from '@/lib/env';

interface OrganizationSecretRow {
  encrypted_tracker_token: Buffer;
  encryption_key_version: number;
}

export async function findOrganizationSecretRow(
  organizationId: string
): Promise<OrganizationSecretRow | null> {
  const res = await query<OrganizationSecretRow>(
    `SELECT encrypted_tracker_token, encryption_key_version
     FROM organization_secrets
     WHERE organization_id = $1`,
    [organizationId]
  );
  return res.rows[0] ?? null;
}

/**
 * Расшифровывает OAuth-токен трекера для организации.
 * Поддерживается только encryption_key_version === 1 (ротация — позже).
 */
export async function getDecryptedOrganizationTrackerToken(
  organizationId: string
): Promise<string | null> {
  const row = await findOrganizationSecretRow(organizationId);
  if (!row) {
    return null;
  }
  if (row.encryption_key_version !== 1) {
    throw new Error(
      `Unsupported organization_secrets.encryption_key_version: ${row.encryption_key_version}`
    );
  }
  const buf = Buffer.isBuffer(row.encrypted_tracker_token)
    ? row.encrypted_tracker_token
    : Buffer.from(row.encrypted_tracker_token);
  const key = getOrgSecretsMasterKey();
  return decryptOrgTrackerToken(buf, key);
}
