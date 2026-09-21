/**
 * Реестр сотрудников организации (staff).
 */

import type { StaffRow } from './types';
import type { QueryParams } from '@/types';

import { query } from '@/lib/db';

const STAFF_ROW_SELECT = `id::text AS id, organization_id, tracker_user_id, display_name, email,
            avatar_url, manual_override_flags, created_at, updated_at`;

export async function listStaff(organizationId: string): Promise<StaffRow[]> {
  const res = await query<StaffRow>(
    `SELECT ${STAFF_ROW_SELECT}
     FROM staff
     WHERE organization_id = $1
     ORDER BY display_name ASC`,
    [organizationId]
  );
  return res.rows;
}

export async function findStaffById(
  organizationId: string,
  staffId: string
): Promise<StaffRow | null> {
  const res = await query<StaffRow>(
    `SELECT ${STAFF_ROW_SELECT}
     FROM staff
     WHERE organization_id = $1 AND id = $2::uuid
     LIMIT 1`,
    [organizationId, staffId]
  );
  return res.rows[0] ?? null;
}

export async function findStaffByOrganizationAndTrackerUserId(
  organizationId: string,
  trackerUserId: string
): Promise<StaffRow | null> {
  const tid = trackerUserId.trim();
  if (!tid) {
    return null;
  }
  const res = await query<StaffRow>(
    `SELECT ${STAFF_ROW_SELECT}
     FROM staff
     WHERE organization_id = $1
       AND (
         NULLIF(TRIM(tracker_user_id), '') = $2
         OR id::text = $2
       )
     LIMIT 1`,
    [organizationId, tid]
  );
  return res.rows[0] ?? null;
}

export async function findStaffByOrganizationAndEmailNorm(
  organizationId: string,
  emailNorm: string
): Promise<StaffRow | null> {
  const key = emailNorm.trim().toLowerCase();
  if (!key) {
    return null;
  }
  const res = await query<StaffRow>(
    `SELECT ${STAFF_ROW_SELECT}
     FROM staff
     WHERE organization_id = $1
       AND email IS NOT NULL
       AND LOWER(TRIM(email)) = $2
     LIMIT 1`,
    [organizationId, key]
  );
  return res.rows[0] ?? null;
}

export async function countAdminsInOrganization(organizationId: string): Promise<number> {
  const res = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM staff s
     INNER JOIN admins a ON a.staff_uid = s.id
     WHERE s.organization_id = $1`,
    [organizationId]
  );
  const n = Number.parseInt(res.rows[0]?.count ?? '0', 10);
  return Number.isFinite(n) ? n : 0;
}

interface InsertStaffInput {
  avatar_url?: string | null;
  display_name: string;
  email?: string | null;
  manual_override_flags?: Record<string, unknown> | null;
  tracker_user_id?: string | null;
}

export async function insertStaff(
  organizationId: string,
  input: InsertStaffInput
): Promise<StaffRow> {
  const res = await query<StaffRow>(
    `INSERT INTO staff (organization_id, tracker_user_id, display_name, email, avatar_url, manual_override_flags)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${STAFF_ROW_SELECT}`,
    [
      organizationId,
      input.tracker_user_id ?? null,
      input.display_name,
      input.email ?? null,
      input.avatar_url ?? null,
      input.manual_override_flags ?? null,
    ]
  );
  const row = res.rows[0];
  if (!row) {
    throw new Error('insertStaff: no row returned');
  }
  return row;
}

export interface UpdateStaffPatch {
  avatar_url?: string | null;
  display_name?: string;
  email?: string | null;
  tracker_user_id?: string | null;
}

export function buildStaffUpdateAssignments(patch: UpdateStaffPatch): {
  assignments: string[];
  values: QueryParams;
} {
  const assignments: string[] = [];
  const values: QueryParams = [];
  let paramIndex = 3;
  const keys: (keyof UpdateStaffPatch)[] = ['display_name', 'email', 'tracker_user_id', 'avatar_url'];
  for (const key of keys) {
    if (patch[key] === undefined) {
      continue;
    }
    assignments.push(`${key} = $${paramIndex}`);
    values.push(patch[key] as QueryParams[number]);
    paramIndex += 1;
  }
  return { assignments, values };
}

export async function updateStaff(
  organizationId: string,
  staffId: string,
  patch: UpdateStaffPatch
): Promise<StaffRow | null> {
  const { assignments, values: patchValues } = buildStaffUpdateAssignments(patch);
  if (assignments.length === 0) {
    return findStaffById(organizationId, staffId);
  }
  const values: QueryParams = [organizationId, staffId, ...patchValues];
  const res = await query<StaffRow>(
    `UPDATE staff
     SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE organization_id = $1 AND id = $2::uuid
     RETURNING ${STAFF_ROW_SELECT}`,
    values
  );
  return res.rows[0] ?? null;
}

export async function deleteStaff(organizationId: string, staffId: string): Promise<boolean> {
  const res = await query(
    `DELETE FROM staff
     WHERE organization_id = $1 AND id = $2::uuid`,
    [organizationId, staffId]
  );
  return (res.rowCount ?? 0) > 0;
}
