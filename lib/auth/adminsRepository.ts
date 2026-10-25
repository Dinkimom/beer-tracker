/**
 * Админы продукта: beer_tracker.admins (staff_uid = staff.id native / registry uuid compatibility).
 */

import { query } from '@/lib/db';

export async function isStaffAdmin(staffUid: string): Promise<boolean> {
  const res = await query<{ one: number }>(
    `SELECT 1 AS one FROM admins WHERE staff_uid = $1::uuid`,
    [staffUid]
  );
  return res.rows.length > 0;
}

export async function insertAdmin(staffUid: string): Promise<void> {
  await query(`INSERT INTO admins (staff_uid) VALUES ($1::uuid) ON CONFLICT (staff_uid) DO NOTHING`, [
    staffUid,
  ]);
}

export async function deleteAdmin(staffUid: string): Promise<void> {
  await query(`DELETE FROM admins WHERE staff_uid = $1::uuid`, [staffUid]);
}

export async function countAdmins(): Promise<number> {
  const res = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM admins`);
  const n = Number.parseInt(res.rows[0]?.count ?? '0', 10);
  return Number.isFinite(n) ? n : 0;
}
