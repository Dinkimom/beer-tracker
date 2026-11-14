/**
 * Квартальный план организации: сборка для клиента и сохранение (docs/QUARTERLY_PLAN_RULES.md).
 * Общий для HTTP-роута и инструментов MCP.
 */

import type { QuarterlyPlanMemberIndex } from './quarterlyPlanMembers';
import type { QuarterlyPlan, QuarterlyPlanSprint, QuarterlyPlanTeam, QuarterRef } from './quarterlyPlanTypes';
import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';
import type { Developer } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { apiCache, cacheKeys } from '@/lib/cache';
import { loadRoleResolutionContext } from '@/lib/sprints/sprintContextTeamMembers';
import { enrichPlannerTeamMembersFromTracker, fetchAllTeamMembersForOrg, listTeams } from '@/lib/staffTeams';
import { convertTeamMemberToDeveloper } from '@/lib/teamMemberUtils';

import { parseQuarterlyPlanContent } from './quarterlyPlanContentParse';
import { buildQuarterlyPlanMemberIndex, planContentForClient, planContentForStorage } from './quarterlyPlanMembers';
import { fetchQuarterlyPlanContent, saveQuarterlyPlanContent } from './quarterlyPlansRepository';
import { buildQuarterWeeks, resolveWeekSpan } from './quarterWeeks';

/** Тот же срок, что у `/api/sprints`: список спринтов доски общий в кэше. */
const SPRINTS_CACHE_TTL_SECONDS = 10 * 60;

type TeamRoster = Omit<QuarterlyPlanTeam, 'sprints'>;

/**
 * Команды организации и их люди (QB1). `forDisplay` — с аватарами и ролями; для сохранения
 * нужны только id, поэтому без похода за аватарами.
 */
async function loadTeamRosters(
  organizationId: string,
  forDisplay: boolean
): Promise<{ index: QuarterlyPlanMemberIndex; rosters: TeamRoster[] }> {
  const [teams, membersRaw, roleCtx] = await Promise.all([
    listTeams(organizationId, { activeOnly: true }),
    fetchAllTeamMembersForOrg(organizationId),
    forDisplay ? loadRoleResolutionContext(organizationId) : undefined,
  ]);
  const members = forDisplay ? await enrichPlannerTeamMembersFromTracker(organizationId, membersRaw) : membersRaw;
  const people: Array<{ developerId: string; staffId: string }> = [];
  const developersByTeam = new Map<string, Developer[]>();
  for (const member of members) {
    const developer = convertTeamMemberToDeveloper(member, roleCtx);
    if (!developer) continue;
    people.push({ developerId: developer.id, staffId: member.uid });
    developersByTeam.set(member.team.uid, [...(developersByTeam.get(member.team.uid) ?? []), developer]);
  }
  const rosters = teams.flatMap((team) => {
    const boardId = Number.parseInt(String(team.tracker_board_id), 10);
    if (!Number.isFinite(boardId)) return [];
    return [{ boardId, id: team.id, members: developersByTeam.get(team.id) ?? [], title: team.title }];
  });
  return { index: buildQuarterlyPlanMemberIndex(people), rosters };
}

async function loadBoardSprints(issueTracker: IssueTrackerProviderClient, boardId: number): Promise<SprintListItem[]> {
  const cacheKey = cacheKeys.sprints(boardId);
  const cached = apiCache.get<SprintListItem[]>(cacheKey);
  if (cached) return cached;
  try {
    const sprints = await issueTracker.listSprints(boardId);
    if (sprints.length > 0) apiCache.set(cacheKey, sprints, SPRINTS_CACHE_TTL_SECONDS);
    return sprints;
  } catch (error) {
    // Без спринтов доска остаётся рабочей: лента спринтов в строке команды просто пустая.
    console.warn(`[quarterly-plan] listSprints(${boardId}):`, error);
    return [];
  }
}

/** Спринты доски, которые задевают квартал рабочими днями (QW5), по порядку дат. */
function sprintsInQuarter(sprints: readonly SprintListItem[], ref: QuarterRef): QuarterlyPlanSprint[] {
  const weeks = buildQuarterWeeks(ref);
  return sprints
    .filter((sprint) => resolveWeekSpan(weeks, sprint.startDate, sprint.endDate) !== null)
    .map((sprint) => ({ endDate: sprint.endDate, id: sprint.id, name: sprint.name, startDate: sprint.startDate }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export async function getQuarterlyPlan(input: {
  issueTracker: IssueTrackerProviderClient;
  organizationId: string;
  ref: QuarterRef;
}): Promise<{ plan: QuarterlyPlan; version: number }> {
  const { issueTracker, organizationId, ref } = input;
  const [{ index, rosters }, stored] = await Promise.all([
    loadTeamRosters(organizationId, true),
    fetchQuarterlyPlanContent(organizationId, ref),
  ]);
  const teams = await Promise.all(
    rosters.map(async (roster) => ({
      ...roster,
      sprints: sprintsInQuarter(await loadBoardSprints(issueTracker, roster.boardId), ref),
    }))
  );
  return { plan: { ...ref, ...planContentForClient(stored.content, index), teams }, version: stored.version };
}

type SaveQuarterlyPlanResult =
  | { error: string; status: 'invalid' }
  | { status: 'conflict' }
  | { status: 'saved'; version: number };

/** Сохраняет план целиком поверх версии `ifVersion` (QS1, QS5). */
export async function saveQuarterlyPlan(input: {
  content: unknown;
  ifVersion: number;
  organizationId: string;
  ref: QuarterRef;
}): Promise<SaveQuarterlyPlanResult> {
  const { index, rosters } = await loadTeamRosters(input.organizationId, false);
  const parsed = parseQuarterlyPlanContent(input.content, input.ref, new Set(rosters.map((roster) => roster.id)));
  if (!parsed.ok) return { error: parsed.error, status: 'invalid' };
  const stored = planContentForStorage(parsed.content, index);
  if (!stored.ok) return { error: stored.error, status: 'invalid' };
  const version = await saveQuarterlyPlanContent({
    content: stored.content,
    ifVersion: input.ifVersion,
    organizationId: input.organizationId,
    ref: input.ref,
  });
  return version === null ? { status: 'conflict' } : { status: 'saved', version };
}
