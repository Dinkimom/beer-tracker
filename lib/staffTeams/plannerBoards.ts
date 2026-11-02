/**
 * Список досок планера: все активные команды организации в PG, без обхода Tracker _paginate.
 * Свои команды (членство) идут первыми и помечены `isMyTeam`.
 */

import type { AccessProfile } from '@/lib/access/orgAccess';
import type { BoardListItem } from '@/lib/api/types';

import { myTeamIdsForAccessProfile } from '@/lib/access/orgAccess';

import { listTeams } from './teamsRepository';

export function mapTeamsToPlannerBoards(
  teams: Array<{
    id: string;
    slug: string;
    title: string;
    tracker_board_id: string;
    tracker_queue_key: string;
  }>,
  myTeamIds: ReadonlySet<string>
): BoardListItem[] {
  const boards = teams.flatMap((team) => {
    const boardNum = Number.parseInt(String(team.tracker_board_id), 10);
    if (!Number.isFinite(boardNum)) {
      return [];
    }
    return [
      {
        id: boardNum,
        isMyTeam: myTeamIds.has(team.id),
        name: team.title,
        queue: team.tracker_queue_key,
        team: team.slug,
        teamTitle: team.title,
      },
    ];
  });
  return [...boards.filter((b) => b.isMyTeam), ...boards.filter((b) => !b.isMyTeam)];
}

export async function listPlannerBoardsForAccessProfile(
  organizationId: string,
  profile: AccessProfile
): Promise<BoardListItem[]> {
  const orgTeams = await listTeams(organizationId, { activeOnly: true });
  return mapTeamsToPlannerBoards(orgTeams, myTeamIdsForAccessProfile(profile));
}
