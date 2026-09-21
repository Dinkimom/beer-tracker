/**
 * Обогащение состава команды для планера: имена из реестра (staff),
 * аватары — лениво из Jira (см. enrichTeamMembersAvatarsFromJira).
 */

import type { TeamMember } from '@/types/team';

import { enrichPlannerTeamMembersAvatarsFromJira } from '@/lib/staffTeams/enrichTeamMembersAvatarsFromJira';

/**
 * Планер / свимлейн / `/api/teams/members`: аватары из Jira в staff (лениво, с TTL-кэшем).
 * Display names не трогаем — источник правды реестр.
 */
export async function enrichPlannerTeamMembersFromTracker(
  organizationId: string,
  members: TeamMember[]
): Promise<TeamMember[]> {
  return await enrichPlannerTeamMembersAvatarsFromJira(organizationId, members);
}
