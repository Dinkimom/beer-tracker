/**
 * Квартальный план организации: сборка для клиента и сохранение (docs/QUARTERLY_PLAN_RULES.md).
 * Общий для HTTP-роута и инструментов MCP.
 */

import type { QuarterlyPlanMemberIndex } from './quarterlyPlanMembers';
import type { QuarterlyPlanOp } from './quarterlyPlanOps';
import type {
  QuarterlyPlan,
  QuarterlyPlanContent,
  QuarterlyPlanSprint,
  QuarterlyPlanTeam,
  QuarterRef,
} from './quarterlyPlanTypes';
import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';
import type { Developer } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { apiCache, cacheKeys } from '@/lib/cache';
import { loadRoleResolutionContext } from '@/lib/sprints/sprintContextTeamMembers';
import { enrichPlannerTeamMembersFromTracker, fetchAllTeamMembersForOrg, listTeams } from '@/lib/staffTeams';
import { convertTeamMemberToDeveloper } from '@/lib/teamMemberUtils';

import { parseQuarterlyPlanContent } from './quarterlyPlanContentParse';
import { buildQuarterlyPlanMemberIndex, planContentForClient, planContentForStorage } from './quarterlyPlanMembers';
import { applyQuarterlyPlanOps as applyOpsToContent } from './quarterlyPlanOps';
import { fetchQuarterlyPlanContent, saveQuarterlyPlanContent } from './quarterlyPlansRepository';
import { loadQuarterlyPlanTrackerEpics } from './quarterlyPlanTrackerEpics';
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

/** Команды организации и их люди без аватаров — для проверки событий отсутствия от агента (QM7). */
export async function loadQuarterlyPlanTeams(organizationId: string): Promise<TeamRoster[]> {
  return (await loadTeamRosters(organizationId, false)).rosters;
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
  const [teams, trackerEpics] = await Promise.all([
    Promise.all(
      rosters.map(async (roster) => ({
        ...roster,
        sprints: sprintsInQuarter(await loadBoardSprints(issueTracker, roster.boardId), ref),
      }))
    ),
    loadQuarterlyPlanTrackerEpics({
      issueKeys: stored.content.epics.flatMap((epic) => (epic.issueKey ? [epic.issueKey] : [])),
      issueTracker,
      organizationId,
    }),
  ]);
  return {
    plan: { ...ref, ...planContentForClient(stored.content, index), teams, trackerEpics },
    version: stored.version,
  };
}

type SaveQuarterlyPlanResult =
  | { error: string; status: 'invalid' }
  | { status: 'conflict' }
  | { status: 'saved'; version: number };

type Rosters = Awaited<ReturnType<typeof loadTeamRosters>>;

async function writePlan(
  input: { content: unknown; ifVersion: number; organizationId: string; ref: QuarterRef },
  { index, rosters }: Rosters
): Promise<SaveQuarterlyPlanResult> {
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

/** Сохраняет план целиком поверх версии `ifVersion` (QS1, QS5). */
export async function saveQuarterlyPlan(input: {
  content: unknown;
  ifVersion: number;
  organizationId: string;
  ref: QuarterRef;
}): Promise<SaveQuarterlyPlanResult> {
  return writePlan(input, await loadTeamRosters(input.organizationId, false));
}

type ApplyOpsResult =
  | { content: QuarterlyPlanContent; refs: Record<string, string>; status: 'preview'; version: number }
  | { content: QuarterlyPlanContent; refs: Record<string, string>; status: 'saved'; version: number }
  | { error: string; opIndex?: number; status: 'invalid' }
  | { status: 'conflict'; version: number };

/**
 * Пакет операций агента над планом (раздел 11): атомарно (QM1), поверх версии `ifVersion` (QM6),
 * с теми же проверками, что у сохранения из UI (QM2). `dryRun` ничего не пишет (QM4).
 */
export async function applyQuarterlyPlanOps(input: {
  dryRun: boolean;
  ifVersion: number;
  ops: readonly QuarterlyPlanOp[];
  organizationId: string;
  ref: QuarterRef;
}): Promise<ApplyOpsResult> {
  const [rosters, stored] = await Promise.all([
    loadTeamRosters(input.organizationId, false),
    fetchQuarterlyPlanContent(input.organizationId, input.ref),
  ]);
  if (stored.version !== input.ifVersion) return { status: 'conflict', version: stored.version };
  const applied = applyOpsToContent({
    content: planContentForClient(stored.content, rosters.index),
    ops: input.ops,
    ref: input.ref,
    teams: {
      memberIdsByTeam: new Map(
        rosters.rosters.map((roster) => [roster.id, new Set(roster.members.map((member) => member.id))])
      ),
    },
  });
  if (!applied.ok) return { error: applied.error, opIndex: applied.opIndex, status: 'invalid' };
  if (input.dryRun) {
    return { content: applied.content, refs: applied.refs, status: 'preview', version: stored.version };
  }
  const saved = await writePlan({ ...input, content: applied.content }, rosters);
  if (saved.status === 'invalid') return saved;
  if (saved.status === 'conflict') return { status: 'conflict', version: stored.version };
  return { content: applied.content, refs: applied.refs, status: 'saved', version: saved.version };
}
