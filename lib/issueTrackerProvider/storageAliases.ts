/**
 * Neutral aliases для Yandex-oriented колонок и ключей settings.
 * SQL-имена не меняем — только единый слой доступа в TypeScript.
 */

import type { OrganizationRow } from '@/lib/organizations/types';
import type { TeamRow } from '@/lib/staffTeams/types';

/** `organizations.tracker_org_id` */
export const DB_ORGANIZATION_EXTERNAL_ORG_ID_COLUMN = 'tracker_org_id';

/** `teams.tracker_board_id` */
export const DB_TEAM_BOARD_ID_COLUMN = 'tracker_board_id';

/** `teams.tracker_queue_key` */
export const DB_TEAM_QUEUE_KEY_COLUMN = 'tracker_queue_key';

/** Provider-neutral подключение организации к внешнему issue tracker. */
interface IssueTrackerOrganizationConnection {
  externalOrgId: string;
}

/** Provider-neutral привязка команды к доске/очереди issue tracker. */
interface IssueTrackerTeamBinding {
  boardId: string;
  queueKey: string;
}

export function readIssueTrackerExternalOrgId(
  org: Pick<OrganizationRow, typeof DB_ORGANIZATION_EXTERNAL_ORG_ID_COLUMN>
): string {
  return org.tracker_org_id?.trim() ?? '';
}

export function toIssueTrackerOrganizationConnection(
  org: Pick<OrganizationRow, typeof DB_ORGANIZATION_EXTERNAL_ORG_ID_COLUMN>
): IssueTrackerOrganizationConnection {
  return { externalOrgId: readIssueTrackerExternalOrgId(org) };
}

export function readIssueTrackerTeamBoardId(
  team: Pick<TeamRow, typeof DB_TEAM_BOARD_ID_COLUMN>
): string {
  return String(team.tracker_board_id ?? '').trim();
}

export function readIssueTrackerTeamQueueKey(
  team: Pick<TeamRow, typeof DB_TEAM_QUEUE_KEY_COLUMN>
): string {
  return String(team.tracker_queue_key ?? '').trim();
}

export function toIssueTrackerTeamBinding(
  team: Pick<TeamRow, typeof DB_TEAM_BOARD_ID_COLUMN | typeof DB_TEAM_QUEUE_KEY_COLUMN>
): IssueTrackerTeamBinding {
  return {
    boardId: readIssueTrackerTeamBoardId(team),
    queueKey: readIssueTrackerTeamQueueKey(team),
  };
}

/** Уникальные ключи очередей команд (для full sync / incremental). */
export function uniqueIssueTrackerQueueKeysFromTeams(
  teams: Array<Pick<TeamRow, typeof DB_TEAM_QUEUE_KEY_COLUMN>>
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const team of teams) {
    const queueKey = readIssueTrackerTeamQueueKey(team);
    if (!queueKey || seen.has(queueKey)) {
      continue;
    }
    seen.add(queueKey);
    out.push(queueKey);
  }
  return out;
}
