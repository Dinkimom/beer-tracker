import type { AdminTeamMember, AdminTeamRow, AdminTrackerCatalogPayload } from '@/lib/api/admin/types';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

import { adminOrgApiPath, adminTeamApiPath } from './paths';

export async function fetchAdminTeams(orgId: string): Promise<AdminTeamRow[]> {
  const { data } = await getPlannerBeerTrackerApi().get<{ teams?: AdminTeamRow[] }>(
    adminOrgApiPath(orgId, 'teams')
  );
  return Array.isArray(data.teams) ? data.teams : [];
}

export async function fetchAdminTrackerCatalog(
  orgId: string,
  params?: { boardId?: number }
): Promise<AdminTrackerCatalogPayload> {
  const { data } = await getPlannerBeerTrackerApi().get<AdminTrackerCatalogPayload>(
    adminOrgApiPath(orgId, 'teams/tracker-catalog'),
    params?.boardId != null ? { params: { boardId: params.boardId } } : undefined
  );
  return {
    boards: Array.isArray(data.boards) ? data.boards : [],
    queues: Array.isArray(data.queues) ? data.queues : [],
    teams: Array.isArray(data.teams) ? data.teams : [],
  };
}

export async function createAdminTeam(
  orgId: string,
  payload: { title: string; tracker_board_id: number; tracker_queue_key: string }
): Promise<AdminTeamRow> {
  const { data } = await getPlannerBeerTrackerApi().post<{ team: AdminTeamRow }>(
    adminOrgApiPath(orgId, 'teams'),
    payload
  );
  return data.team;
}

export async function patchAdminTeam(
  orgId: string,
  teamId: string,
  payload: Record<string, unknown>
): Promise<void> {
  await getPlannerBeerTrackerApi().patch(adminTeamApiPath(orgId, teamId), payload);
}

export async function deleteAdminTeam(orgId: string, teamId: string): Promise<void> {
  await getPlannerBeerTrackerApi().delete(adminTeamApiPath(orgId, teamId));
}

export async function fetchAdminTeamMembers(
  orgId: string,
  teamId: string
): Promise<AdminTeamMember[]> {
  const { data } = await getPlannerBeerTrackerApi().get<{ members: AdminTeamMember[] }>(
    adminTeamApiPath(orgId, teamId, 'members')
  );
  return data.members;
}

interface AdminTeamRegistrySearchItem {
  avatarUrl?: string | null;
  displayName: string;
  email?: string | null;
  staffUid: string;
  trackerId: string;
}

export async function searchAdminTeamRegistry(
  orgId: string,
  teamId: string,
  query: string,
  signal?: AbortSignal
): Promise<AdminTeamRegistrySearchItem[]> {
  const { data } = await getPlannerBeerTrackerApi().get<{
    items?: Array<{
      avatar_link?: string | null;
      email?: string | null;
      full_name?: string | null;
      name?: string | null;
      staff_uid: string;
      tracker_id?: string | null;
    }>;
  }>(adminTeamApiPath(orgId, teamId, 'registry-search'), {
    params: { q: query },
    signal,
  });
  const rows = Array.isArray(data.items) ? data.items : [];
  return rows.map((row) => {
    const staffUid = row.staff_uid.trim();
    return {
      avatarUrl: row.avatar_link ?? null,
      displayName: row.full_name?.trim() || row.name?.trim() || staffUid,
      email: row.email?.trim() || null,
      staffUid,
      trackerId: row.tracker_id?.trim() || staffUid,
    };
  });
}

export async function postAdminTeamMember(
  orgId: string,
  teamId: string,
  body: Record<string, unknown>
): Promise<void> {
  await getPlannerBeerTrackerApi().post(adminTeamApiPath(orgId, teamId, 'members'), body);
}

export async function patchAdminTeamMember(
  orgId: string,
  teamId: string,
  staffId: string,
  body: { role_slug: string | null }
): Promise<void> {
  await getPlannerBeerTrackerApi().patch(
    adminTeamApiPath(orgId, teamId, `members/${staffId}`),
    body
  );
}

export async function deleteAdminTeamMember(
  orgId: string,
  teamId: string,
  staffId: string
): Promise<void> {
  await getPlannerBeerTrackerApi().delete(adminTeamApiPath(orgId, teamId, `members/${staffId}`));
}
