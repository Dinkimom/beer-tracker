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

import {
  boardAvailabilityEventFromRow,
  listBoardAvailabilityEvents,
} from '@/lib/boardAvailability/boardAvailabilityEventsRepository';
import { apiCache, cacheKeys } from '@/lib/cache';
import { parseIsoDateOnly } from '@/lib/isoDateOnlyCalendar';
import { loadRoleResolutionContext } from '@/lib/sprints/sprintContextTeamMembers';
import { enrichPlannerTeamMembersFromTracker, fetchAllTeamMembersForOrg, listTeams } from '@/lib/staffTeams';
import { convertTeamMemberToDeveloper } from '@/lib/teamMemberUtils';

import { parseQuarterlyPlanContent } from './quarterlyPlanContentParse';
import {
  buildMemberAbsenceDays,
  collectDutyRiskAssignmentIds,
  collectQuarterlyPlanIssues,
  type QuarterlyPlanIssue,
} from './quarterlyPlanIssues';
import { planIssueKeys } from './quarterlyPlanLayout';
import { buildQuarterlyPlanMemberIndex, planContentForClient, planContentForStorage } from './quarterlyPlanMembers';
import { applyQuarterlyPlanOps as applyOpsToContent } from './quarterlyPlanOps';
import {
  buildSprintQuarterPlanView,
  type SprintQuarterPlanInput,
  type SprintQuarterPlanView,
  type SprintQuarterTask,
} from './quarterlyPlanSprintLink';
import { fetchQuarterlyPlanContent, saveQuarterlyPlanContent } from './quarterlyPlansRepository';
import { loadQuarterlyPlanTrackerEpics } from './quarterlyPlanTrackerEpics';
import { buildQuarterWeeks, quarterOfDate, resolveWeekSpan } from './quarterWeeks';

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

/**
 * Спринты доски, которые задевают квартал рабочими днями (QW5), по порядку дат. Только спринты самой
 * доски: трекер отдаёт в её списке и спринты соседних досок, где есть её задачи (QB3).
 */
function sprintsInQuarter(sprints: readonly SprintListItem[], boardId: number, ref: QuarterRef): QuarterlyPlanSprint[] {
  const weeks = buildQuarterWeeks(ref);
  return sprints
    .filter((sprint) => !sprint.board?.id || sprint.board.id === String(boardId))
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
        sprints: sprintsInQuarter(await loadBoardSprints(issueTracker, roster.boardId), roster.boardId, ref),
      }))
    ),
    loadQuarterlyPlanTrackerEpics({
      issueKeys: planIssueKeys(stored.content),
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

/** Проблемы назначений (QI1–QI3, QI6) и риски дежурства (QV3) — как их считает доска. */
interface QuarterlyPlanFindings {
  /** Назначения, в срок которых попадает дежурство исполнителя. */
  dutyRiskAssignmentIds: string[];
  issues: QuarterlyPlanIssue[];
}

/** Проблемы и риски плана по событиям отсутствия досок его команд (QM4). */
export async function findQuarterlyPlanProblems(plan: QuarterlyPlan): Promise<QuarterlyPlanFindings> {
  const eventsByBoard = new Map(
    await Promise.all(
      plan.teams.map(
        async (team) =>
          [team.boardId, (await listBoardAvailabilityEvents(team.boardId)).map(boardAvailabilityEventFromRow)] as const
      )
    )
  );
  const absence = buildMemberAbsenceDays(plan.teams, eventsByBoard, buildQuarterWeeks(plan));
  return {
    dutyRiskAssignmentIds: collectDutyRiskAssignmentIds(plan, absence),
    issues: collectQuarterlyPlanIssues(plan, absence, false),
  };
}

type ApplyOpsResult =
  { content: QuarterlyPlanContent; refs: Record<string, string>; status: 'saved'; version: number } | { error: string; opIndex?: number; status: 'invalid' } | { status: 'conflict'; version: number } | QuarterlyPlanFindings & {
      content: QuarterlyPlanContent;
      refs: Record<string, string>;
      status: 'preview';
      version: number;
    };

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
    // Предпросмотр показывает, что пакет сделает с проблемами плана (QM4); спринты и трекер не нужны.
    const findings = await findQuarterlyPlanProblems({
      ...input.ref,
      ...applied.content,
      teams: rosters.rosters.map((roster) => ({ ...roster, sprints: [] })),
      trackerEpics: {},
    });
    return { ...findings, content: applied.content, refs: applied.refs, status: 'preview', version: stored.version };
  }
  const saved = await writePlan({ ...input, content: applied.content }, rosters);
  if (saved.status === 'invalid') return saved;
  if (saved.status === 'conflict') return { status: 'conflict', version: stored.version };
  return { content: applied.content, refs: applied.refs, status: 'saved', version: saved.version };
}

/** Черновик агента в квартале, применённый к текущему плану (QM9); `content` null — пакет больше не применяется. */
interface SprintQuarterDraftInput {
  content: QuarterlyPlanContent | null;
  error: string | null;
  proposalId: string;
  summary: string;
}

type SprintQuarterDraftView = Pick<SprintQuarterPlanView, 'assignments' | 'directions' | 'epics' | 'outsidePlan' | 'tasks'>;

/** План квартала в окне спринта и, если есть, свой черновик агента — каким станет вид после принятия (QK6). */
type SprintQuarterPlanWithDraft = SprintQuarterPlanView & {
  pendingProposal?: { after?: SprintQuarterDraftView; error?: string; proposalId: string; summary: string };
};

/** Квартал спринта для агента (раздел 12): команда доски и вид каждого плана, который задевает спринт. */
export interface SprintQuarterContext {
  plans: SprintQuarterPlanWithDraft[];
  team: { id: string; title: string } | null;
}

/** Кварталы, которые задевает окно спринта: обычно один, на стыке кварталов — два (QW3). */
function quartersOfWindow(window: { endDate: string; startDate: string }): QuarterRef[] {
  const refs = [window.startDate, window.endDate].flatMap((iso) => {
    const parsed = parseIsoDateOnly(iso.slice(0, 10));
    return parsed ? [quarterOfDate(new Date(parsed.y, parsed.m - 1, parsed.d, 12))] : [];
  });
  return refs.filter((ref, index) => refs.findIndex((other) => other.year === ref.year && other.quarter === ref.quarter) === index);
}

function rowIssueKeys(view: SprintQuarterPlanView | null): string[] {
  return view ? [...view.directions, ...view.epics].flatMap((row) => (row.issueKey ? [row.issueKey] : [])) : [];
}

function pendingProposalView(
  draft: SprintQuarterDraftInput,
  after: SprintQuarterPlanView | null
): NonNullable<SprintQuarterPlanWithDraft['pendingProposal']> {
  const base = { proposalId: draft.proposalId, summary: draft.summary };
  if (!after) return { ...base, error: draft.error ?? 'the draft no longer applies' };
  const { assignments, directions, epics, outsidePlan, tasks } = after;
  return { ...base, after: { assignments, directions, epics, outsidePlan, tasks } };
}

/**
 * Что квартальный план говорит о спринте (QK1–QK6). Назначения — людей команды доски спринта и исполнителей
 * его задач (или одного `onlyMemberId`). `loadDraft` — свой черновик агента в квартале: вид плана после него
 * кладётся рядом. Нет окна спринта, сохранённого плана и черновика — null.
 */
export async function loadSprintQuarterContext(input: {
  boardId?: number;
  issueTracker: IssueTrackerProviderClient;
  loadDraft?: (ref: QuarterRef) => Promise<SprintQuarterDraftInput | null>;
  onlyMemberId?: string;
  organizationId: string;
  sprintWindow?: { endDate: string; startDate: string };
  tasks: readonly SprintQuarterTask[];
}): Promise<SprintQuarterContext | null> {
  const { loadDraft, sprintWindow } = input;
  if (!sprintWindow?.startDate || !sprintWindow.endDate) return null;
  const refs = quartersOfWindow(sprintWindow);
  const [{ index, rosters }, stored] = await Promise.all([
    loadTeamRosters(input.organizationId, false),
    Promise.all(
      refs.map(async (ref) => {
        const [plan, draft] = await Promise.all([
          fetchQuarterlyPlanContent(input.organizationId, ref),
          loadDraft ? loadDraft(ref) : null,
        ]);
        return { ...plan, draft, ref };
      })
    ),
  ]);
  const relevant = stored.filter((plan) => plan.version > 0 || plan.draft);
  if (relevant.length === 0) return null;

  const team = rosters.find((roster) => roster.boardId === input.boardId) ?? null;
  const memberIds = new Set(
    input.onlyMemberId
      ? [input.onlyMemberId]
      : [
          ...(team?.members.map((member) => member.id) ?? []),
          ...input.tasks.flatMap((task) => (task.assigneeId ? [task.assigneeId] : [])),
        ]
  );
  const memberNames = new Map(rosters.flatMap((roster) => roster.members.map((member) => [member.id, member.name] as const)));
  const view = (plan: SprintQuarterPlanInput) =>
    buildSprintQuarterPlanView({ memberIds, memberNames, plan, sprintWindow, tasks: input.tasks });

  const plans = relevant.map((plan) => ({
    base: { content: planContentForClient(plan.content, index), ref: plan.ref, trackerEpics: {}, version: plan.version },
    draft: plan.draft,
  }));
  const draftView = (plan: (typeof plans)[number], trackerEpics: SprintQuarterPlanInput['trackerEpics']) =>
    plan.draft?.content ? view({ ...plan.base, content: plan.draft.content, trackerEpics }) : null;
  // Названия и «готово» из трекера — только у строк, которые попали в ответ (QE5, QE8).
  const trackerEpics = await loadQuarterlyPlanTrackerEpics({
    issueKeys: plans.flatMap((plan) => [...rowIssueKeys(view(plan.base)), ...rowIssueKeys(draftView(plan, {}))]),
    issueTracker: input.issueTracker,
    organizationId: input.organizationId,
  });
  return {
    plans: plans.flatMap((plan) => {
      const current = view({ ...plan.base, trackerEpics });
      if (!current) return [];
      return [plan.draft ? { ...current, pendingProposal: pendingProposalView(plan.draft, draftView(plan, trackerEpics)) } : current];
    }),
    team: team ? { id: team.id, title: team.title } : null,
  };
}
