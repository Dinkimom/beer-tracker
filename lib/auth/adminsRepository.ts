/**
 * Админы продукта: beer_tracker.admins (staff_uid = staff.id native / registry uuid compatibility).
 */

import { query } from '@/lib/db';
import { getBeerTrackerSchema } from '@/lib/env';

let tableEnsured = false;

function qualifySchemaName(schema: string): string {
  return schema.includes('-') ? `"${schema}"` : schema;
}

export async function ensureAdminsTable(): Promise<void> {
  if (tableEnsured) {
    return;
  }
  const schema = qualifySchemaName(getBeerTrackerSchema());
  await query(`
    CREATE TABLE IF NOT EXISTS ${schema}.admins (
      staff_uid UUID PRIMARY KEY,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`
    ALTER TABLE IF EXISTS ${schema}.analytics_events
      DROP CONSTRAINT IF EXISTS analytics_events_user_id_fkey
  `);
  tableEnsured = true;
}

export async function isStaffAdmin(staffUid: string): Promise<boolean> {
  await ensureAdminsTable();
  const res = await query<{ one: number }>(
    `SELECT 1 AS one FROM admins WHERE staff_uid = $1::uuid`,
    [staffUid]
  );
  return res.rows.length > 0;
}

export async function insertAdmin(staffUid: string): Promise<void> {
  await ensureAdminsTable();
  await query(`INSERT INTO admins (staff_uid) VALUES ($1::uuid) ON CONFLICT (staff_uid) DO NOTHING`, [
    staffUid,
  ]);
}

export async function deleteAdmin(staffUid: string): Promise<void> {
  await ensureAdminsTable();
  await query(`DELETE FROM admins WHERE staff_uid = $1::uuid`, [staffUid]);
}

export async function countAdmins(): Promise<number> {
  await ensureAdminsTable();
  const res = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM admins`);
  const n = Number.parseInt(res.rows[0]?.count ?? '0', 10);
  return Number.isFinite(n) ? n : 0;
}

/** Для тестов. */
export function resetAdminsTableEnsured(): void {
  tableEnsured = false;
}
