/**
 * Команды организации (beer_tracker.teams).
 */

import type { TeamRow } from './types';
import type { QueryParams } from '@/types';

import { query } from '@/lib/db';

import { buildTeamUpdateAssignments } from './teamUpdateSqlHelpers';

interface ListTeamsOptions {
  activeOnly?: boolean;
}

const TEAM_ROW_SELECT = `
        id::text AS id,
        organization_id,
        slug,
        title,
        tracker_queue_key,
        tracker_board_id::text AS tracker_board_id,
        COALESCE(active, TRUE) AS active,
        created_at,
        updated_at`;

export async function listTeams(
  organizationId: string,
  options: ListTeamsOptions = {}
): Promise<TeamRow[]> {
  const activeOnly = options.activeOnly === true;
  const res = await query<TeamRow>(
    `SELECT ${TEAM_ROW_SELECT}
     FROM teams
     WHERE organization_id = $1
       AND (NOT $2::boolean OR COALESCE(active, TRUE) = TRUE)
     ORDER BY title ASC`,
    [organizationId, activeOnly]
  );
  return res.rows;
}

export async function findTeamById(
  organizationId: string,
  teamId: string
): Promise<TeamRow | null> {
  const res = await query<TeamRow>(
    `SELECT ${TEAM_ROW_SELECT}
     FROM teams
     WHERE organization_id = $1 AND id = $2
     LIMIT 1`,
    [organizationId, teamId]
  );
  return res.rows[0] ?? null;
}

/** Резолв команды по доске трекера. */
export async function getTeamByBoardId(
  organizationId: string,
  boardId: number | string
): Promise<TeamRow | null> {
  const res = await query<TeamRow>(
    `SELECT ${TEAM_ROW_SELECT}
     FROM teams
     WHERE organization_id = $1 AND tracker_board_id = $2::bigint
     LIMIT 1`,
    [organizationId, String(boardId)]
  );
  return res.rows[0] ?? null;
}

interface InsertTeamInput {
  active?: boolean;
  slug: string;
  title: string;
  tracker_board_id: number | string;
  tracker_queue_key: string;
}

export async function insertTeam(
  organizationId: string,
  input: InsertTeamInput
): Promise<TeamRow> {
  const res = await query<TeamRow>(
    `INSERT INTO teams (organization_id, slug, title, tracker_queue_key, tracker_board_id, active)
     VALUES ($1, $2, $3, $4, $5::bigint, COALESCE($6, TRUE))
     RETURNING ${TEAM_ROW_SELECT}`,
    [
      organizationId,
      input.slug,
      input.title,
      input.tracker_queue_key,
      String(input.tracker_board_id),
      input.active ?? null,
    ]
  );
  const row = res.rows[0];
  if (!row) {
    throw new Error('insertTeam: no row returned');
  }
  return row;
}

interface UpdateTeamPatch {
  active?: boolean;
  slug?: string;
  title?: string;
  tracker_board_id?: number | string;
  tracker_queue_key?: string;
}

const TEAM_UPDATE_COLUMNS: (keyof UpdateTeamPatch)[] = [
  'slug',
  'title',
  'tracker_queue_key',
  'tracker_board_id',
  'active',
];

export async function updateTeam(
  organizationId: string,
  teamId: string,
  patch: UpdateTeamPatch
): Promise<TeamRow | null> {
  const { assignments, values: patchValues } = buildTeamUpdateAssignments(patch, TEAM_UPDATE_COLUMNS);
  if (assignments.length === 0) {
    return findTeamById(organizationId, teamId);
  }
  const values: QueryParams = [organizationId, teamId, ...patchValues];
  const res = await query<TeamRow>(
    `UPDATE teams
     SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE organization_id = $1 AND id = $2
     RETURNING ${TEAM_ROW_SELECT}`,
    values
  );
  return res.rows[0] ?? null;
}

export async function deleteTeam(
  organizationId: string,
  teamId: string
): Promise<boolean> {
  const res = await query(
    `DELETE FROM teams
     WHERE organization_id = $1 AND id = $2`,
    [organizationId, teamId]
  );
  return (res.rowCount ?? 0) > 0;
}
