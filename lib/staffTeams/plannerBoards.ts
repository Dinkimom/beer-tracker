/**
 * Список досок планера: активные команды организации в PG, без обхода Tracker _paginate.
 */

import type { AccessProfile } from '@/lib/access/orgAccess';
import type { BoardListItem } from '@/lib/api/types';

import { filterTeamsVisibleInPlanner } from '@/lib/access/orgAccess';

import { listTeams } from './teamsRepository';

export function mapTeamsToPlannerBoards(
  teams: Array<{
    slug: string;
    title: string;
    tracker_board_id: string;
    tracker_queue_key: string;
  }>
): BoardListItem[] {
  return teams.flatMap((team) => {
    const boardNum = Number.parseInt(String(team.tracker_board_id), 10);
    if (!Number.isFinite(boardNum)) {
      return [];
    }
    return [
      {
        id: boardNum,
        name: team.title,
        queue: team.tracker_queue_key,
        team: team.slug,
        teamTitle: team.title,
      },
    ];
  });
}

export async function listPlannerBoardsForAccessProfile(
  organizationId: string,
  profile: AccessProfile
): Promise<BoardListItem[]> {
  const orgTeamsAll = await listTeams(organizationId, { activeOnly: true });
  const orgTeams = filterTeamsVisibleInPlanner(profile, orgTeamsAll);
  return mapTeamsToPlannerBoards(orgTeams);
}
