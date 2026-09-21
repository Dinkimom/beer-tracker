/** Native directory queries: beer_tracker.staff + team_members. */

import { STAFF_AVATAR_URL_SQL } from '@/lib/staffTeams/nativeTeamMembersSql';

export const NATIVE_REGISTRY_EMPLOYEES_DIRECTORY_SQL = `
        s.id::text AS employee_id,
        s.id::text AS staff_uid,
        s.tracker_user_id AS tracker_id,
        s.email,
        s.display_name AS name,
        NULL::text AS surname,
        NULL::text AS patronymic,
        s.display_name AS full_name,
        NULL::text AS status,
        ${STAFF_AVATAR_URL_SQL} AS avatar_link,
        EXISTS (SELECT 1 FROM admins a WHERE a.staff_uid = s.id) AS is_org_admin,
        NULL::text AS fired_date,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'team_id', t.id::text,
                'team_title', t.title
              )
              ORDER BY t.title
            )
            FROM team_members tm
            INNER JOIN teams t ON t.id = tm.team_id
            WHERE tm.staff_id = s.id
              AND t.organization_id = $1
          ),
          '[]'::json
        ) AS teams
     FROM staff s
     WHERE s.organization_id = $1
     ORDER BY s.display_name ASC
`;

export const NATIVE_ORGANIZATION_MEMBER_DIRECTORY_SQL = `
            s.id::text AS user_id,
            CASE WHEN a.staff_uid IS NOT NULL THEN 'org_admin' ELSE 'member' END AS org_role,
            COALESCE(NULLIF(LOWER(TRIM(s.email)), ''), '') AS email,
            s.created_at,
            EXISTS (
              SELECT 1
              FROM team_members tm
              INNER JOIN teams t ON t.id = tm.team_id
              WHERE tm.staff_id = s.id
                AND t.organization_id = $1
            ) AS has_team_membership,
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'team_id', t.id::text,
                    'title', t.title,
                    'is_team_lead', (
                      LOWER(COALESCE(tm.role_slug, '')) LIKE '%lead%'
                      OR LOWER(COALESCE(tm.role_slug, '')) LIKE '%рук%'
                    ),
                    'is_team_member', true
                  )
                  ORDER BY t.title
                )
                FROM team_members tm
                INNER JOIN teams t ON t.id = tm.team_id
                WHERE tm.staff_id = s.id
                  AND t.organization_id = $1
              ),
              '[]'::json
            ) AS teams_json
     FROM staff s
     LEFT JOIN admins a ON a.staff_uid = s.id
     WHERE s.organization_id = $1
     ORDER BY s.display_name ASC
`;
