import type { HolidayCountryCode } from '@/lib/holidays/holidayCountries';
import type { IssueTrackerIssue } from '@/lib/issueTrackerProvider/types';
import type {
  SprintContextPayload,
  SprintContextPosition,
  SprintContextSoftMeta,
  SprintContextUnplannedTask,
} from '@/lib/sprints/sprintContextTypes';
import type { NextRequest } from 'next/server';

import { readOrgHolidayCountry } from '@/lib/holidays/orgHolidayCountry';
import {
  getIssueTrackerProviderClientForOrganization,
  getIssueTrackerProviderClientFromRequest,
} from '@/lib/issueTrackerProvider/clientFactory';
import { resolutionFromCustomFields } from '@/lib/issueTrackerProvider/mapIssueTrackerIssueToTask';
import { resolveMcpIssueStatusCategory } from '@/lib/mcp/resolveMcpIssueStatusCategory';
import { findOrganizationById } from '@/lib/organizations';
import { loadSprintTaskCompletionRules } from '@/lib/sprints/loadSprintTaskCompletionRules';
import { buildSprintContextCapacity } from '@/lib/sprints/sprintContextCapacity';
import {
  buildSprintContextAgenda,
  buildSprintContextCalendarDays,
  buildSprintContextWeekendDays,
  collectOffBoardUnplannedAssignees,
  collectSprintContextWarnings,
  parseStaffUuidFromAssigneeId,
} from '@/lib/sprints/sprintContextEnrichmentHelpers';
import { resolveFeatureScopeTaskIds } from '@/lib/sprints/sprintContextFilter';
import { loadSprintContextHolidayDays } from '@/lib/sprints/sprintContextHolidays';
import { buildPlanVsActual } from '@/lib/sprints/sprintContextPlanVsActual';
import {
  loadSprintContextTeamMembers,
  stampCapacityWithTeamRoles,
} from '@/lib/sprints/sprintContextTeamMembers';
import { isTaskCompleted, type SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';
import { listStaff } from '@/lib/staffTeams';

async function loadOrgHolidayCountry(
  organizationId: string
): Promise<HolidayCountryCode> {
  const org = await findOrganizationById(organizationId);
  return readOrgHolidayCountry(org?.settings);
}

interface AssigneeInfo {
  email: string | null;
  name: string;
}

interface IssueInfo {
  assigneeDisplay: string | null;
  assigneeTrackerId: string | null;
  createdAt: string | null;
  inSprint: boolean;
  issueType: string | null;
  parentKey: string | null;
  priority: string | null;
  qaEngineerDisplay: string | null;
  resolution: string | null;
  sprintHistory: Array<{ name: string; sprintId: string }>;
  statusDisplay: string | null;
  statusId: string | null;
  statusKey: string | null;
  statusTypeKey: string | null;
  storyPoints: number | null;
  summary: string;
  testPoints: number | null;
}

function buildAssigneeLookup(staffRows: Array<{
  display_name: string;
  email: string | null;
  id: string;
  tracker_user_id: string | null;
}>): {
  byStaffId: Map<string, AssigneeInfo>;
  byTrackerId: Map<string, AssigneeInfo>;
} {
  const byStaffId = new Map<string, AssigneeInfo>();
  const byTrackerId = new Map<string, AssigneeInfo>();
  for (const row of staffRows) {
    const info: AssigneeInfo = {
      email: row.email?.trim() || null,
      name: row.display_name.trim() || row.id,
    };
    byStaffId.set(row.id, info);
    byStaffId.set(`staff:${row.id}`, info);
    const trackerId = row.tracker_user_id?.trim();
    if (trackerId) {
      byTrackerId.set(trackerId, info);
    }
  }
  return { byStaffId, byTrackerId };
}

function resolveAssignee(
  assigneeId: string,
  lookup: ReturnType<typeof buildAssigneeLookup>
): AssigneeInfo | null {
  const trimmed = assigneeId.trim();
  if (!trimmed) {
    return null;
  }
  const fromDirect = lookup.byStaffId.get(trimmed) ?? lookup.byTrackerId.get(trimmed);
  if (fromDirect) {
    return fromDirect;
  }
  const staffUuid = parseStaffUuidFromAssigneeId(trimmed);
  return staffUuid ? (lookup.byStaffId.get(staffUuid) ?? null) : null;
}

function issueTypeLabel(issue: IssueTrackerIssue): string | null {
  const display = issue.type?.display?.trim();
  if (display) {
    return display;
  }
  const key = issue.type?.key?.trim();
  return key || null;
}

function mapSprintHistory(
  sprint: IssueTrackerIssue['sprint']
): Array<{ name: string; sprintId: string }> {
  if (!sprint) {
    return [];
  }
  const rows = Array.isArray(sprint) ? sprint : [sprint];
  const byId = new Map<string, { name: string; sprintId: string }>();
  for (const row of rows) {
    if (typeof row === 'string') {
      const id = row.trim();
      if (id) {
        byId.set(id, { name: id, sprintId: id });
      }
      continue;
    }
    const sprintId = String(row.id ?? '').trim();
    if (!sprintId) {
      continue;
    }
    byId.set(sprintId, {
      name: row.display?.trim() || sprintId,
      sprintId,
    });
  }
  return [...byId.values()];
}

function mapIssueInfo(issue: IssueTrackerIssue, inSprint: boolean): IssueInfo {
  return {
    assigneeDisplay: issue.assignee?.display?.trim() || null,
    assigneeTrackerId: issue.assignee?.id?.trim() || null,
    createdAt: issue.createdAt?.trim() || null,
    inSprint,
    issueType: issueTypeLabel(issue),
    parentKey: issue.parent?.key?.trim() || null,
    priority: issue.priority?.display?.trim() || issue.priority?.key?.trim() || null,
    qaEngineerDisplay: issue.qaEngineer?.display?.trim() || null,
    resolution: resolutionFromCustomFields(issue.customFields)?.trim() || null,
    sprintHistory: mapSprintHistory(issue.sprint),
    statusDisplay: issue.status?.display?.trim() || null,
    statusId: issue.status?.id?.trim() || null,
    statusKey: issue.status?.key?.trim() || null,
    statusTypeKey: issue.statusType?.key?.trim() || null,
    storyPoints: issue.storyPoints ?? null,
    summary: issue.summary?.trim() || issue.key,
    testPoints: issue.testPoints ?? null,
  };
}

function mapIssuesByKey(issues: IssueTrackerIssue[]): Map<string, IssueInfo> {
  const map = new Map<string, IssueInfo>();
  for (const issue of issues) {
    if (!issue.key) {
      continue;
    }
    map.set(issue.key, mapIssueInfo(issue, true));
  }
  return map;
}

async function softLoadSprintIssues(input: {
  organizationId: string;
  request: NextRequest | null;
  sprintId: number;
  sprintStatus?: string;
  taskIds: string[];
  useStoredTracker: boolean;
}): Promise<{
  /** Справочник статусов для канона «сделано»; null — не загрузился. */
  completionRules: SprintTaskCompletionRules | null;
  issuesByKey: Map<string, IssueInfo>;
  loaded: boolean;
  warning?: string;
}> {
  try {
    const issueTracker = input.useStoredTracker
      ? await getIssueTrackerProviderClientForOrganization(input.organizationId)
      : await getIssueTrackerProviderClientFromRequest(input.request!);
    const issues = await issueTracker.getTasksInSprintWithParents(input.sprintId, {
      sprintStatus: input.sprintStatus,
    });
    const issuesByKey = mapIssuesByKey(issues);
    const completionRules = await loadSprintTaskCompletionRules(input.organizationId, issueTracker).catch(
      (error: unknown) => {
        console.warn(`[sprint-context] soft status catalog(${input.sprintId}):`, error);
        return null;
      }
    );

    const missing = input.taskIds.filter((taskId) => taskId && !issuesByKey.has(taskId));
    if (missing.length > 0) {
      await Promise.all(
        missing.slice(0, 40).map(async (taskId) => {
          try {
            const issue = await issueTracker.getIssue(taskId);
            if (!issue?.key) {
              return;
            }
            issuesByKey.set(issue.key, mapIssueInfo(issue, false));
          } catch (error) {
            console.warn(`[sprint-context] soft getIssue(${taskId}):`, error);
          }
        })
      );
    }

    const stillMissing = input.taskIds.filter((taskId) => taskId && !issuesByKey.has(taskId));
    if (stillMissing.length > 0) {
      return {
        completionRules,
        issuesByKey,
        loaded: true,
        warning: `tracker_issues_partial: missing summaries for ${stillMissing.slice(0, 8).join(', ')}${
          stillMissing.length > 8 ? ', …' : ''
        }`,
      };
    }
    return { completionRules, issuesByKey, loaded: true };
  } catch (error) {
    console.warn(`[sprint-context] soft issues(${input.sprintId}):`, error);
    return {
      completionRules: null,
      issuesByKey: new Map(),
      loaded: false,
      warning: `tracker_issues_unavailable: could not load issue summaries for sprint ${input.sprintId}`,
    };
  }
}

function enrichPosition(
  position: SprintContextPosition,
  lookup: ReturnType<typeof buildAssigneeLookup>,
  issuesByKey: Map<string, IssueInfo>,
  sprintStatus: string | undefined,
  trackerIssuesLoaded: boolean,
  completionRules: SprintTaskCompletionRules | null
): { position: SprintContextPosition; unresolved: boolean } {
  const next = { ...position };
  const assignee = resolveAssignee(position.assigneeId, lookup);
  if (assignee) {
    next.assigneeName = assignee.name;
    next.assigneeEmail = assignee.email;
  }
  const issue = issuesByKey.get(position.taskId);
  if (issue) {
    next.summary = issue.summary;
    next.issueType = issue.issueType;
    next.parentKey = issue.parentKey;
    next.status = issue.statusKey;
    next.statusDisplay = issue.statusDisplay;
    next.statusType = issue.statusTypeKey;
    next.statusCategory = resolveMcpIssueStatusCategory({
      statusKey: issue.statusKey,
      statusTypeKey: issue.statusTypeKey,
    });
    next.priority = issue.priority;
    next.createdAt = issue.createdAt;
    if (issue.sprintHistory.length > 0) {
      next.sprintHistory = issue.sprintHistory;
    }
  }
  next.planVsActual = buildPlanVsActual({
    inSprint: issue?.inSprint,
    issueCompleted:
      issue != null &&
      isTaskCompleted(
        {
          originalStatus: issue.statusKey ?? undefined,
          originalStatusId: issue.statusId ?? undefined,
          resolution: issue.resolution ?? undefined,
          statusTypeKey: issue.statusTypeKey ?? undefined,
        },
        completionRules
      ),
    issueFound: issue != null,
    position,
    sprintStatus,
    trackerIssuesLoaded,
  });
  return { position: next, unresolved: !assignee };
}

function toUnplannedTask(
  taskId: string,
  issue: IssueInfo,
  lookup: ReturnType<typeof buildAssigneeLookup>
): SprintContextUnplannedTask {
  const staff = issue.assigneeTrackerId ? lookup.byTrackerId.get(issue.assigneeTrackerId) : undefined;
  return {
    assigneeId: issue.assigneeTrackerId,
    assigneeName: staff?.name ?? issue.assigneeDisplay,
    issueType: issue.issueType,
    parentKey: issue.parentKey,
    priority: issue.priority,
    qaEngineerName: issue.qaEngineerDisplay,
    status: issue.statusKey,
    statusCategory: resolveMcpIssueStatusCategory({
      statusKey: issue.statusKey,
      statusTypeKey: issue.statusTypeKey,
    }),
    statusDisplay: issue.statusDisplay,
    storyPoints: issue.storyPoints,
    summary: issue.summary,
    taskId,
    testPoints: issue.testPoints,
  };
}

/**
 * Задачи спринта в трекере без позиции на доске (с учётом featureId-скоупа).
 * Трекер не ответил — undefined: пустой список выдавал бы себя за «бэклог пуст».
 */
function buildUnplannedTasks(
  payload: SprintContextPayload,
  issues: { issuesByKey: Map<string, IssueInfo>; loaded: boolean },
  lookup: ReturnType<typeof buildAssigneeLookup>
): SprintContextUnplannedTask[] | undefined {
  if (!issues.loaded) {
    return undefined;
  }
  const positioned = new Set(payload.positions.map((position) => position.taskId));
  const featureId = payload.meta.featureId;
  const featureScope = featureId
    ? resolveFeatureScopeTaskIds(payload.featureLanes, featureId)
    : null;
  const tasks: SprintContextUnplannedTask[] = [];
  for (const [taskId, issue] of issues.issuesByKey) {
    if (!issue.inSprint || positioned.has(taskId)) {
      continue;
    }
    if (featureScope && !featureScope.has(taskId) && issue.parentKey !== featureId) {
      continue;
    }
    tasks.push(toUnplannedTask(taskId, issue, lookup));
  }
  return tasks.sort((a, b) => a.taskId.localeCompare(b.taskId));
}

/**
 * Attach assignee names, issue summaries, unplanned sprint tasks, calendarDays, agenda, warnings.
 */
export async function enrichSprintContextPayload(input: {
  organizationId: string;
  payload: SprintContextPayload;
  request: NextRequest | null;
  softMeta?: SprintContextSoftMeta;
  useStoredTracker: boolean;
}): Promise<SprintContextPayload> {
  const softWarnings = [...(input.softMeta?.warnings ?? input.payload.meta.warnings ?? [])];
  const staffRows = await listStaff(input.organizationId);
  const lookup = buildAssigneeLookup(staffRows);

  const {
    completionRules,
    issuesByKey,
    loaded: trackerIssuesLoaded,
    warning: issuesWarning,
  } = await softLoadSprintIssues({
    organizationId: input.organizationId,
    request: input.request,
    sprintId: input.payload.meta.sprintId,
    sprintStatus: input.payload.meta.sprintWindow?.status,
    taskIds: input.payload.positions.map((position) => position.taskId),
    useStoredTracker: input.useStoredTracker,
  });
  if (issuesWarning) {
    softWarnings.push(issuesWarning);
  }

  const unresolvedAssigneeIds: string[] = [];
  const sprintStatus = input.payload.meta.sprintWindow?.status;
  const positions = input.payload.positions.map((position) => {
    const { position: next, unresolved } = enrichPosition(
      position,
      lookup,
      issuesByKey,
      sprintStatus,
      trackerIssuesLoaded,
      completionRules
    );
    if (unresolved && position.assigneeId) {
      unresolvedAssigneeIds.push(position.assigneeId);
    }
    return next;
  });

  const notes = input.payload.notes.map((note) => {
    const assignee = resolveAssignee(note.assigneeId, lookup);
    if (!assignee) {
      return note;
    }
    return { ...note, assigneeName: assignee.name };
  });

  const calendarDays = buildSprintContextCalendarDays(
    input.payload.meta.sprintWindow?.startDate,
    input.payload.meta.sprintWindow?.endDate
  );
  const weekendDays = buildSprintContextWeekendDays(
    input.payload.meta.sprintWindow?.startDate,
    input.payload.meta.sprintWindow?.endDate
  );
  if (
    input.payload.meta.sprintWindow?.startDate &&
    input.payload.meta.sprintWindow?.endDate &&
    calendarDays.length === 0
  ) {
    softWarnings.push('calendar_days_unavailable: could not map working days from sprint window');
  }

  const holidayCountry = await loadOrgHolidayCountry(input.organizationId);
  const { holidayDays, warning: holidaysWarning } = await loadSprintContextHolidayDays({
    calendarDays,
    country: holidayCountry,
  });
  if (holidaysWarning) {
    softWarnings.push(holidaysWarning);
  }

  const agenda = buildSprintContextAgenda(positions, calendarDays);
  const emptyPlan =
    positions.length === 0 &&
    notes.length === 0 &&
    input.payload.taskLinks.length === 0 &&
    input.payload.sprintGoals.delivery.length === 0 &&
    input.payload.sprintGoals.discovery.length === 0;

  const teamMembers = await loadSprintContextTeamMembers({
    boardId: input.payload.meta.boardId,
    organizationId: input.organizationId,
  });

  const unplannedTasks = buildUnplannedTasks(
    input.payload,
    { issuesByKey, loaded: trackerIssuesLoaded },
    lookup
  );
  const warnings = collectSprintContextWarnings({
    emptyPlan,
    offBoardAssignees: collectOffBoardUnplannedAssignees(unplannedTasks, { positions, teamMembers }),
    softWarnings,
    unresolvedAssigneeIds: [...new Set(unresolvedAssigneeIds)],
  });

  const enrichedBase = {
    ...input.payload,
    agenda,
    meta: {
      ...input.payload.meta,
      ...(calendarDays.length > 0 ? { calendarDays } : {}),
      holidayCountry,
      ...(holidayDays.length > 0 ? { holidayDays } : {}),
      ...(weekendDays.length > 0 ? { weekendDays } : {}),
      ...(warnings.length > 0 ? { warnings } : {}),
    },
    notes,
    positions,
    ...(teamMembers.length > 0 ? { teamMembers } : {}),
    unplannedTasks,
  };

  return {
    ...enrichedBase,
    capacity: stampCapacityWithTeamRoles(
      buildSprintContextCapacity(enrichedBase),
      teamMembers
    ),
  };
}
