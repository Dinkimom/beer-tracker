/**
 * Идентичность сессии: beer_tracker.staff.
 */

import { query } from '@/lib/db';

interface ProductIdentityRow {
  created_at: Date;
  email: string;
  id: string;
}

function isPgErrorCode(err: unknown, code: string): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === code;
}

export async function findUserByEmail(email: string): Promise<ProductIdentityRow | null> {
  const key = email.trim().toLowerCase();
  const res = await query<ProductIdentityRow>(
    `SELECT DISTINCT ON (LOWER(TRIM(s.email)))
       s.id::text AS id,
       LOWER(TRIM(s.email)) AS email,
       s.created_at
     FROM staff s
     WHERE s.email IS NOT NULL
       AND LOWER(TRIM(s.email)) = LOWER(TRIM($1))
     ORDER BY LOWER(TRIM(s.email)), s.created_at ASC`,
    [key]
  );
  return res.rows[0] ?? null;
}

export async function findUserById(userId: string): Promise<ProductIdentityRow | null> {
  try {
    const res = await query<ProductIdentityRow>(
      `SELECT
         s.id::text AS id,
         COALESCE(NULLIF(LOWER(TRIM(s.email)), ''), '') AS email,
         s.created_at
       FROM staff s
       WHERE s.id = $1::uuid
       LIMIT 1`,
      [userId]
    );
    return res.rows[0] ?? null;
  } catch (err) {
    if (isPgErrorCode(err, '22P02')) {
      return null;
    }
    throw err;
  }
}
