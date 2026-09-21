/**
 * Team-level ACL из beer_tracker.team_members + staff.
 */

import { findUserById } from '@/lib/auth/userRepository';
import { query } from '@/lib/db';
import { NATIVE_TEAM_LEAD_PREDICATE } from '@/lib/staffTeams/nativeTeamMembersSql';

interface UserTeamMembershipRow {
  created_at: Date;
  id: string;
  is_team_lead: boolean;
  is_team_member: boolean;
  team_id: string;
  user_id: string;
}

export async function listUserTeamMembershipsInOrganization(
  organizationId: string,
  userId: string
): Promise<UserTeamMembershipRow[]> {
  const user = await findUserById(userId);
  if (!user) {
    return [];
  }
  const res = await query<UserTeamMembershipRow>(
    `SELECT DISTINCT ON (tm.team_id)
       CONCAT($1::uuid::text, ':', $2::uuid::text, ':', tm.team_id::text) AS id,
       $2::uuid::text AS user_id,
       tm.team_id::text AS team_id,
       ${NATIVE_TEAM_LEAD_PREDICATE} AS is_team_lead,
       TRUE AS is_team_member,
       CURRENT_TIMESTAMP AS created_at
     FROM team_members tm
     INNER JOIN teams t ON t.id = tm.team_id
     WHERE t.organization_id = $1::uuid
       AND tm.staff_id = $2::uuid
     ORDER BY tm.team_id`,
    [organizationId, user.id]
  );
  return res.rows;
}

export type ProductTeamRole = 'team_lead' | 'team_member';

export async function userHasTeamMembershipInOrganization(
  organizationId: string,
  userId: string
): Promise<boolean> {
  const rows = await listUserTeamMembershipsInOrganization(organizationId, userId);
  return rows.length > 0;
}
