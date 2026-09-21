/** Native roster: beer_tracker.teams + team_members + staff. */

/** Колонка staff.avatar_url, иначе legacy JSONB manual_override_flags.avatarUrl. */
export const STAFF_AVATAR_URL_SQL = `NULLIF(TRIM(COALESCE(s.avatar_url, s.manual_override_flags->>'avatarUrl')), '')`;

export const NATIVE_TEAM_LEAD_PREDICATE = `
  (
    LOWER(COALESCE(tm.role_slug, '')) LIKE '%lead%'
    OR LOWER(COALESCE(tm.role_slug, '')) LIKE '%рук%'
  )
`;

export const NATIVE_TEAM_MEMBER_ROSTER_FROM = `
       FROM teams t
       INNER JOIN team_members tm ON tm.team_id = t.id
       INNER JOIN staff s ON s.id = tm.staff_id
`;

export const NATIVE_TEAM_MEMBER_QUERY_SELECT = `
          tm.role_slug AS role_slug,
          s.id::text AS staff_id,
          s.display_name AS staff_display_name,
          s.email AS staff_email,
          ${STAFF_AVATAR_URL_SQL} AS staff_avatar_url,
          NULLIF(TRIM(s.tracker_user_id), '') AS staff_tracker_user_id,
          s.manual_override_flags AS staff_manual_override_flags,
          t.id::text AS team_id,
          t.slug AS team_slug,
          t.title AS team_title,
          t.tracker_queue_key AS team_tracker_queue_key,
          t.tracker_board_id::text AS team_tracker_board_id,
          COALESCE(t.active, TRUE) AS team_active
`;

export const NATIVE_TEAM_MEMBERS_WITH_STAFF_SELECT = `
        tm.team_id::text AS team_id,
        s.id::text AS staff_id,
        tm.role_slug AS role_slug,
        s.display_name AS staff_display_name,
        s.email AS staff_email,
        ${STAFF_AVATAR_URL_SQL} AS staff_avatar_url,
        NULLIF(TRIM(s.tracker_user_id), '') AS staff_tracker_user_id,
        s.id::text AS product_user_id,
        ${NATIVE_TEAM_LEAD_PREDICATE} AS product_planner_is_team_lead,
        TRUE AS product_user_in_org,
        TRUE AS product_team_access,
        FALSE AS pending_product_invitation
`;
