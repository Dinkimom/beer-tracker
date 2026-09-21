/**
 * Состав команд: beer_tracker.team_members + staff.
 */

import type { TeamMemberRow, TeamMemberWithStaffRow } from './types';

import { query } from '@/lib/db';

import {
  NATIVE_TEAM_MEMBERS_WITH_STAFF_SELECT,
  NATIVE_TEAM_MEMBER_ROSTER_FROM,
} from './nativeTeamMembersSql';

export async function listTeamMembersWithStaff(
  organizationId: string,
  teamId: string
): Promise<TeamMemberWithStaffRow[]> {
  const res = await query<TeamMemberWithStaffRow>(
    `SELECT ${NATIVE_TEAM_MEMBERS_WITH_STAFF_SELECT}
     ${NATIVE_TEAM_MEMBER_ROSTER_FROM}
     WHERE t.organization_id = $1
       AND tm.team_id = $2::uuid
     ORDER BY staff_display_name ASC`,
    [organizationId, teamId]
  );
  return res.rows;
}

export async function listTeamIdsForStaffInOrganization(
  organizationId: string,
  staffId: string
): Promise<string[]> {
  const res = await query<{ team_id: string }>(
    `SELECT tm.team_id::text AS team_id
     FROM team_members tm
     INNER JOIN teams t ON t.id = tm.team_id
     WHERE t.organization_id = $1
       AND tm.staff_id = $2::uuid`,
    [organizationId, staffId]
  );
  return res.rows.map((r) => r.team_id);
}

export async function addTeamMember(
  organizationId: string,
  teamId: string,
  staffId: string,
  roleSlug?: string | null
): Promise<TeamMemberRow | null> {
  const res = await query<TeamMemberRow>(
    `INSERT INTO team_members (team_id, staff_id, role_slug)
     SELECT $2::uuid, $3::uuid, $4
     WHERE EXISTS (
       SELECT 1 FROM teams t
       WHERE t.id = $2::uuid AND t.organization_id = $1
     )
     AND EXISTS (
       SELECT 1 FROM staff s
       WHERE s.id = $3::uuid AND s.organization_id = $1
     )
     ON CONFLICT (team_id, staff_id) DO UPDATE SET role_slug = EXCLUDED.role_slug
     RETURNING team_id, staff_id, role_slug`,
    [organizationId, teamId, staffId, roleSlug ?? null]
  );
  return res.rows[0] ?? null;
}

export async function addOrgStaffToTeam(
  organizationId: string,
  teamId: string,
  staffId: string,
  roleSlug?: string | null
): Promise<TeamMemberRow | null> {
  const existing = await query<{ one: number }>(
    `SELECT 1 AS one
     FROM team_members tm
     INNER JOIN teams t ON t.id = tm.team_id
     WHERE t.organization_id = $1
       AND tm.team_id = $2::uuid
       AND tm.staff_id = $3::uuid
     LIMIT 1`,
    [organizationId, teamId, staffId]
  );
  if (existing.rows[0]) {
    return null;
  }
  return addTeamMember(organizationId, teamId, staffId, roleSlug);
}

export async function updateTeamMemberRole(
  organizationId: string,
  teamId: string,
  staffId: string,
  roleSlug: string | null
): Promise<TeamMemberRow | null> {
  const res = await query<TeamMemberRow>(
    `UPDATE team_members tm
     SET role_slug = $4
     FROM teams t
     WHERE tm.team_id = t.id
       AND t.organization_id = $1
       AND tm.team_id = $2::uuid
       AND tm.staff_id = $3::uuid
     RETURNING tm.team_id, tm.staff_id, tm.role_slug`,
    [organizationId, teamId, staffId, roleSlug]
  );
  return res.rows[0] ?? null;
}

export async function removeTeamMember(
  organizationId: string,
  teamId: string,
  staffId: string
): Promise<boolean> {
  const res = await query(
    `DELETE FROM team_members tm
     USING teams t
     WHERE tm.team_id = t.id
       AND t.organization_id = $1
       AND tm.team_id = $2::uuid
       AND tm.staff_id = $3::uuid`,
    [organizationId, teamId, staffId]
  );
  return (res.rowCount ?? 0) > 0;
}
