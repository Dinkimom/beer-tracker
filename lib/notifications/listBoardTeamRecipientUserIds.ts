import { fetchTeamMembersByBoardIdForOrg } from '@/lib/staffTeams/teamMembersQuery';

/** uuid сотрудников команды доски (включая инициатора). */
export async function listBoardTeamRecipientUserIds(input: {
  boardId: number;
  organizationId: string;
}): Promise<string[]> {
  const members = await fetchTeamMembersByBoardIdForOrg(input.organizationId, input.boardId);
  return members
    .map((member) => member.uid?.trim())
    .filter((uid): uid is string => Boolean(uid));
}
