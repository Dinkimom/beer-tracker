/**
 * Задачи в спринте по полю sprint в beer_tracker.issue_snapshots.
 */

import type { TrackerIssue } from '@/types/tracker';

import { query } from '@/lib/db';
import { trackerIssueFromSnapshotRow } from '@/lib/snapshots/issueSnapshotRowMapping';
import {
  ISSUE_SNAPSHOT_FIELDS_JSONB_SQL,
  issueJsonbSprintWhereSql,
} from '@/lib/snapshots/overseerIssueDataSprintSql';

interface SprintSnapshotQueryParams {
  /** Точное совпадение functionalTeam (как колонка team в CH при фильтре по доске). */
  functionalTeamExact?: string | null;
  /** Снимки issue_snapshots не хранят changelog — флаг оставлен для совместимости callers. */
  omitLogsAndComments?: boolean;
  sprintId?: string | null;
  sprintName: string;
}

interface IssueSnapshotSprintRow {
  issue_key: string;
  payload: unknown;
}

function snapshotTeamClause(team: string | null): string {
  if (!team) {
    return '';
  }
  return ` AND trim(coalesce(${ISSUE_SNAPSHOT_FIELDS_JSONB_SQL}->>'functionalTeam', '')) = $4`;
}

/**
 * Задачи, у которых в снимке спринт совпадает с именем/id.
 */
export async function queryIssueSnapshotsMatchingSprint(
  organizationId: string,
  params: SprintSnapshotQueryParams
): Promise<TrackerIssue[]> {
  const sprintName = params.sprintName.trim();
  const sprintId =
    params.sprintId != null && String(params.sprintId).trim() !== ''
      ? String(params.sprintId).trim()
      : '';
  if (!sprintId && !sprintName) {
    return [];
  }

  const team = params.functionalTeamExact?.trim() || null;
  const sprintWhere = issueJsonbSprintWhereSql(ISSUE_SNAPSHOT_FIELDS_JSONB_SQL, 2, 3);
  const sql = `SELECT issue_key, payload
     FROM issue_snapshots
     WHERE organization_id = $1::uuid
       AND ${sprintWhere}${snapshotTeamClause(team)}`;
  const queryParams = team
    ? [organizationId, sprintId, sprintName, team]
    : [organizationId, sprintId, sprintName];

  const res = await query<IssueSnapshotSprintRow>(sql, queryParams);
  return res.rows.map((row) => trackerIssueFromSnapshotRow(row.issue_key, row.payload));
}
