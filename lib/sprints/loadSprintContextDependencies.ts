import type { IssueTrackerIssueLink } from '@/lib/issueTrackerProvider/issueLinkTypes';
import type { IssueTrackerIssue, IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';
import type { QuarterlyPlanSprint } from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { SprintContextDependencies, SprintContextPayload } from '@/lib/sprints/sprintContextTypes';
import type { SprintInfo } from '@/types/tracker';

import { resolutionFromCustomFields } from '@/lib/issueTrackerProvider/mapIssueTrackerIssueToTask';
import { resolveMcpIssueStatusCategory } from '@/lib/mcp/resolveMcpIssueStatusCategory';
import { buildSprintCards } from '@/lib/quarterlyPlans/quarterlyPlanSprintCards';
import { loadSprintTaskCompletionRules } from '@/lib/sprints/loadSprintTaskCompletionRules';
import { buildSprintContextDependencies, type DependencyTaskInfo } from '@/lib/sprints/sprintContextDependencies';
import { mapSprintHistory } from '@/lib/sprints/sprintContextEnrichment';
import { cardDatesOfPayload, sprintTaskDone } from '@/lib/sprints/sprintContextToday';
import { isTaskCompleted, type SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';
import { listTaskCardSpans } from '@/lib/sprints/taskPositionsRepository';

/** Сколько задач вне спринта читаем из трекера по одной. */
const OUTSIDE_ISSUES_LIMIT = 40;

type Tracker = Pick<
  IssueTrackerProviderClient,
  'getIssue' | 'getSprint' | 'listIssueLinksBatch' | 'listStatuses' | 'providerKind'
>;

/** Задачи спринта: карточки (кроме перенесённых в трекере) и бэклог спринта, со сроками на этой доске. */
function collectSprintTasks(payload: SprintContextPayload): Map<string, DependencyTaskInfo> {
  const tasks = new Map<string, DependencyTaskInfo>();
  const positions = payload.positions.filter((position) => position.inTrackerSprint !== false);
  const cards = cardDatesOfPayload(payload);
  for (const position of positions) {
    const card = cards[position.taskId];
    tasks.set(position.taskId, {
      assigneeName: position.assigneeName,
      done: sprintTaskDone(position),
      statusCategory: position.statusCategory,
      summary: position.summary,
      ...(card ? { plannedEnd: card.endDate, plannedStart: card.startDate } : {}),
    });
  }
  for (const task of payload.unplannedTasks ?? []) {
    if (!tasks.has(task.taskId)) {
      tasks.set(task.taskId, {
        assigneeName: task.assigneeName,
        done: sprintTaskDone(task),
        statusCategory: task.statusCategory,
        summary: task.summary,
      });
    }
  }
  return tasks;
}

function outsideKeys(
  links: Record<string, IssueTrackerIssueLink[]>,
  sprintTasks: ReadonlyMap<string, DependencyTaskInfo>
): string[] {
  const keys = new Set<string>();
  for (const list of Object.values(links)) {
    for (const link of list) {
      const key = link.linkedIssueKey?.trim();
      if (key && !sprintTasks.has(key)) {
        keys.add(key);
      }
    }
  }
  return [...keys].sort((a, b) => a.localeCompare(b));
}

async function loadSprints(issueTracker: Tracker, ids: readonly string[]): Promise<Map<string, SprintInfo>> {
  const rows = await Promise.all(
    ids.map(async (id) => {
      const numeric = Number(id);
      if (!Number.isInteger(numeric) || numeric <= 0) return [];
      try {
        return [[id, await issueTracker.getSprint(numeric)] as const];
      } catch (error) {
        console.warn(`[sprint-context] dependencies getSprint(${id}):`, error);
        return [];
      }
    })
  );
  return new Map(rows.flat());
}

/** Текущий спринт задачи — самый поздний из её спринтов в трекере. */
function latestSprint(issue: IssueTrackerIssue, sprints: ReadonlyMap<string, SprintInfo>): SprintInfo | undefined {
  return mapSprintHistory(issue.sprint)
    .flatMap((item) => sprints.get(item.sprintId) ?? [])
    .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
}

function outsideInfo(
  issue: IssueTrackerIssue,
  sprint: SprintInfo | undefined,
  rules: SprintTaskCompletionRules | null
): DependencyTaskInfo {
  const statusKey = issue.status?.key?.trim() || null;
  const statusTypeKey = issue.statusType?.key?.trim() || null;
  return {
    assigneeName: issue.assignee?.display?.trim() || null,
    done: isTaskCompleted(
      {
        originalStatus: statusKey ?? undefined,
        originalStatusId: issue.status?.id?.trim() || undefined,
        resolution: resolutionFromCustomFields(issue.customFields)?.trim() || undefined,
        statusTypeKey: statusTypeKey ?? undefined,
      },
      rules
    ),
    statusCategory: resolveMcpIssueStatusCategory({ statusKey, statusTypeKey }),
    summary: issue.summary?.trim() || issue.key,
    ...(sprint ? { sprint: { name: sprint.name, sprintId: sprint.id, status: sprint.status } } : {}),
  };
}

/**
 * Задачи вне спринта: статус и текущий спринт из трекера, сроки — по карточке на доске этого спринта.
 * Карточка на доске другого спринта не считается: задачу оттуда уже перенесли.
 */
async function loadOutside(input: {
  issueTracker: Tracker;
  keys: readonly string[];
  organizationId: string;
  partsPerDay: number;
}): Promise<Map<string, DependencyTaskInfo>> {
  const [issues, rules] = await Promise.all([
    Promise.all(
      input.keys.map((key) =>
        input.issueTracker.getIssue(key).catch((error: unknown) => {
          console.warn(`[sprint-context] dependencies getIssue(${key}):`, error);
          return null;
        })
      )
    ),
    loadSprintTaskCompletionRules(input.organizationId, input.issueTracker).catch(() => null),
  ]);
  const found = issues.filter((issue): issue is IssueTrackerIssue => Boolean(issue?.key));
  const sprintIds = [...new Set(found.flatMap((issue) => mapSprintHistory(issue.sprint).map((item) => item.sprintId)))];
  const sprints = await loadSprints(input.issueTracker, sprintIds);
  const current = new Map(found.map((issue) => [issue.key, latestSprint(issue, sprints)] as const));
  const planSprints: QuarterlyPlanSprint[] = [...new Map(
    [...current.values()].flatMap((sprint) => (sprint ? [[sprint.id, sprint] as const] : []))
  ).values()].map((sprint) => ({ endDate: sprint.endDate, id: sprint.id, name: sprint.name, startDate: sprint.startDate }));
  const spans = await listTaskCardSpans({
    organizationId: input.organizationId,
    sprintIds: planSprints.map((sprint) => sprint.id),
    taskIds: found.map((issue) => issue.key),
  });
  const cards = buildSprintCards({
    partsPerDay: input.partsPerDay,
    positions: spans.filter((span) => current.get(span.taskId)?.id === span.sprintId),
    sprints: planSprints,
  });
  return new Map(
    found.map((issue) => {
      const card = cards[issue.key];
      const info = outsideInfo(issue, current.get(issue.key), rules);
      return [issue.key, card ? { ...info, plannedEnd: card.endDate, plannedStart: card.startDate } : info] as const;
    })
  );
}

/**
 * Зависимости задач спринта (`include: ["dependencies"]`): связи трекера пакетом, стрелки доски и где
 * стоит другая сторона. Трекер не ответил — блок со стрелками доски и предупреждением.
 */
export async function loadSprintContextDependencies(input: {
  issueTracker: Tracker;
  organizationId: string;
  payload: SprintContextPayload;
}): Promise<SprintContextDependencies> {
  const { payload } = input;
  const sprintTasks = collectSprintTasks(payload);
  const boardArrows = payload.taskLinks.filter(
    (link) => sprintTasks.has(link.fromTaskId) && sprintTasks.has(link.toTaskId)
  );
  const warnings: string[] = [];
  let trackerLinks: Record<string, IssueTrackerIssueLink[]> = {};
  let outside = new Map<string, DependencyTaskInfo>();
  try {
    trackerLinks = await input.issueTracker.listIssueLinksBatch([...sprintTasks.keys()]);
    const keys = outsideKeys(trackerLinks, sprintTasks);
    if (keys.length > OUTSIDE_ISSUES_LIMIT) {
      warnings.push(`dependencies_partial: ${keys.length} linked issues outside the sprint, read the first ${OUTSIDE_ISSUES_LIMIT}`);
    }
    outside = await loadOutside({
      issueTracker: input.issueTracker,
      keys: keys.slice(0, OUTSIDE_ISSUES_LIMIT),
      organizationId: input.organizationId,
      partsPerDay: payload.meta.partsPerDay,
    });
  } catch (error) {
    console.warn(`[sprint-context] dependencies(${payload.meta.sprintId}):`, error);
    warnings.push('dependencies_tracker_unavailable: tracker links not loaded, board arrows only');
  }
  const dependencies = buildSprintContextDependencies({ boardArrows, outside, sprintTasks, trackerLinks });
  return warnings.length > 0 ? { ...dependencies, warnings } : dependencies;
}
