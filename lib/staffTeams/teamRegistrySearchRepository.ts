import { query } from '@/lib/db';
import { STAFF_AVATAR_URL_SQL } from '@/lib/staffTeams/nativeTeamMembersSql';

interface RegistryEmployeeSearchRow {
  avatar_link: string | null;
  email: string | null;
  full_name: string | null;
  name: string | null;
  patronymic: string | null;
  staff_uid: string;
  surname: string | null;
  tracker_id: string | null;
}

export async function searchRegistryEmployeesForTeam(input: {
  pattern: string;
  teamId: string;
}): Promise<RegistryEmployeeSearchRow[]> {
  const res = await query<RegistryEmployeeSearchRow>(
    `SELECT
        s.id::text AS staff_uid,
        s.tracker_user_id AS tracker_id,
        s.email,
        s.display_name AS name,
        NULL::text AS surname,
        NULL::text AS patronymic,
        s.display_name AS full_name,
        ${STAFF_AVATAR_URL_SQL} AS avatar_link
     FROM staff s
     INNER JOIN teams t ON t.id = $2::uuid AND t.organization_id = s.organization_id
     WHERE (
         COALESCE(s.display_name, '') ILIKE $1
         OR COALESCE(s.email, '') ILIKE $1
         OR COALESCE(s.tracker_user_id, '') ILIKE $1
       )
       AND NOT EXISTS (
         SELECT 1
         FROM team_members tm
         WHERE tm.team_id = t.id
           AND tm.staff_id = s.id
       )
     ORDER BY s.display_name ASC
     LIMIT 30`,
    [input.pattern, input.teamId]
  );
  return res.rows;
}
