import type { TeamRow } from './types';

function shouldSkipTeamInBindingSearch(
  teamId: string,
  excludeTeamId?: string
): boolean {
  return excludeTeamId != null && teamId === excludeTeamId;
}

function findFirstMatchingTeam(
  teams: readonly TeamRow[],
  excludeTeamId: string | undefined,
  matches: (team: TeamRow) => boolean
): TeamRow | null {
  for (const team of teams) {
    if (shouldSkipTeamInBindingSearch(team.id, excludeTeamId)) {
      continue;
    }
    if (matches(team)) {
      return team;
    }
  }
  return null;
}

export function findTeamBlockingBoard(
  teams: readonly TeamRow[],
  boardId: number,
  excludeTeamId?: string
): TeamRow | null {
  if (!Number.isFinite(boardId) || boardId <= 0) {
    return null;
  }
  return findFirstMatchingTeam(teams, excludeTeamId, (team) => {
    const parsed = Number.parseInt(String(team.tracker_board_id), 10);
    return Number.isFinite(parsed) && parsed === boardId;
  });
}
