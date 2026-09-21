/**
 * Участники команд и поиск staff (beer_tracker.staff / team_members).
 */

import type { TeamMember } from '@/types/team';

import { query } from '@/lib/db';

import {
  NATIVE_TEAM_MEMBER_QUERY_SELECT,
  NATIVE_TEAM_MEMBER_ROSTER_FROM,
  STAFF_AVATAR_URL_SQL,
} from './nativeTeamMembersSql';
import { getTeamByBoardId } from './teamsRepository';

interface StaffRegistryItem {
  avatarUrl?: string | null;
  birthdate?: string | null;
  displayName: string;
  email?: string | null;
  staffUid?: string;
  trackerId: string;
}

interface NativeStaffSearchRow {
  avatar_link: string | null;
  display_name: string;
  email: string | null;
  id: string;
  tracker_user_id: string | null;
}

const STAFF_SEARCH_SELECT = `
        s.id::text AS id,
        s.tracker_user_id,
        s.display_name,
        s.email,
        ${STAFF_AVATAR_URL_SQL} AS avatar_link
`;

function staffRowToItem(row: NativeStaffSearchRow): StaffRegistryItem {
  const staffUid = row.id.trim();
  const email = row.email?.trim() || null;
  const displayName = row.display_name.trim() || staffUid;
  return {
    trackerId: row.tracker_user_id?.trim() || staffUid,
    displayName,
    avatarUrl: row.avatar_link,
    birthdate: null,
    email,
    ...(staffUid ? { staffUid } : {}),
  };
}

function manualFlagString(
  flags: Record<string, unknown> | null,
  key: string
): string | null {
  if (!flags || typeof flags !== 'object') {
    return null;
  }
  const v = flags[key];
  if (typeof v !== 'string' || !v.trim()) {
    return null;
  }
  return v.trim();
}

function splitDisplayName(displayName: string): { firstName: string; lastName: string } {
  const t = displayName.trim();
  if (!t) {
    return { firstName: '', lastName: '' };
  }
  const parts = t.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0] ?? '', lastName: '' };
  }
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

interface TeamMemberQueryRow {
  role_slug: string | null;
  staff_avatar_url: string | null;
  staff_display_name: string;
  staff_email: string | null;
  staff_id: string;
  staff_manual_override_flags: Record<string, unknown> | null;
  staff_tracker_user_id: string | null;
  team_active: boolean;
  team_id: string;
  team_slug: string;
  team_title: string;
  team_tracker_board_id: string;
  team_tracker_queue_key: string;
}

function mapTeamMemberRow(row: TeamMemberQueryRow): TeamMember {
  const { firstName, lastName } = splitDisplayName(row.staff_display_name);
  const email = row.staff_email ?? undefined;
  const flags = row.staff_manual_override_flags;
  const roleSlug = row.role_slug?.trim();
  const boardNum = Number.parseInt(String(row.team_tracker_board_id), 10);

  return {
    uid: row.staff_id,
    tracker_uid: row.staff_tracker_user_id,
    login: email?.split('@')[0] ?? '',
    firstName,
    lastName,
    middleName: undefined,
    email,
    displayName: row.staff_display_name,
    avatarUrl: row.staff_avatar_url ?? manualFlagString(flags, 'avatarUrl'),
    team: {
      uid: row.team_id,
      slug: row.team_slug,
      title: row.team_title,
      queue: row.team_tracker_queue_key,
      board: Number.isFinite(boardNum) ? boardNum : 0,
    },
    role: roleSlug
      ? { uid: roleSlug, slug: roleSlug, title: roleSlug }
      : undefined,
    active: row.team_active !== false,
  };
}

export async function fetchTeamMembersByBoardIdForOrg(
  organizationId: string,
  boardId: number
): Promise<TeamMember[]> {
  const team = await getTeamByBoardId(organizationId, boardId);
  if (!team) {
    return [];
  }

  const res = await query<TeamMemberQueryRow>(
    `SELECT ${NATIVE_TEAM_MEMBER_QUERY_SELECT}
     ${NATIVE_TEAM_MEMBER_ROSTER_FROM}
     WHERE t.organization_id = $1 AND t.id = $2::uuid
     ORDER BY staff_display_name ASC`,
    [organizationId, team.id]
  );
  return res.rows.map(mapTeamMemberRow);
}

export async function fetchAllTeamMembersForOrg(
  organizationId: string
): Promise<TeamMember[]> {
  const res = await query<TeamMemberQueryRow>(
    `SELECT ${NATIVE_TEAM_MEMBER_QUERY_SELECT}
     ${NATIVE_TEAM_MEMBER_ROSTER_FROM}
     WHERE t.organization_id = $1
       AND COALESCE(t.active, TRUE) = TRUE
     ORDER BY staff_display_name ASC`,
    [organizationId]
  );
  return res.rows.map(mapTeamMemberRow);
}

export async function searchStaffInOrg(
  organizationId: string,
  queryText: string
): Promise<StaffRegistryItem[]> {
  const q = queryText.trim();
  if (!q || q.length < 2) {
    return [];
  }
  const pattern = `%${q.replace(/%/g, '\\%')}%`;
  const res = await query<NativeStaffSearchRow>(
    `SELECT ${STAFF_SEARCH_SELECT}
     FROM staff s
     WHERE s.organization_id = $1
       AND (
         COALESCE(s.display_name, '') ILIKE $2
         OR COALESCE(s.email, '') ILIKE $2
         OR COALESCE(s.tracker_user_id, '') ILIKE $2
       )
     ORDER BY s.display_name ASC
     LIMIT 30`,
    [organizationId, pattern]
  );
  return res.rows.map(staffRowToItem);
}

export async function getStaffByTrackerUserIdInOrg(
  organizationId: string,
  trackerUserId: string
): Promise<StaffRegistryItem | null> {
  const res = await query<NativeStaffSearchRow>(
    `SELECT ${STAFF_SEARCH_SELECT}
     FROM staff s
     WHERE s.organization_id = $1
       AND (NULLIF(TRIM(s.tracker_user_id), '') = $2 OR s.id::text = $2)
     LIMIT 1`,
    [organizationId, trackerUserId]
  );
  const row = res.rows[0];
  return row ? staffRowToItem(row) : null;
}

export async function getStaffByTrackerUserIdsInOrg(
  organizationId: string,
  trackerUserIds: string[]
): Promise<StaffRegistryItem[]> {
  if (trackerUserIds.length === 0) {
    return [];
  }
  const res = await query<NativeStaffSearchRow>(
    `SELECT ${STAFF_SEARCH_SELECT}
     FROM staff s
     WHERE s.organization_id = $1
       AND (
         NULLIF(TRIM(s.tracker_user_id), '') = ANY($2::text[])
         OR s.id::text = ANY($2::text[])
       )`,
    [organizationId, trackerUserIds]
  );
  return res.rows.map(staffRowToItem);
}
