import type { IssueTrackerIssue } from '@/lib/issueTrackerProvider/types';
import type {
  SprintContextPayload,
  SprintContextPosition,
  SprintContextSoftMeta,
} from '@/lib/sprints/sprintContextTypes';
import type { NextRequest } from 'next/server';

import {
  getIssueTrackerProviderClientForOrganization,
  getIssueTrackerProviderClientFromRequest,
} from '@/lib/issueTrackerProvider/clientFactory';
import { resolveMcpIssueStatusCategory } from '@/lib/mcp/resolveMcpIssueStatusCategory';
import { buildSprintContextCapacity } from '@/lib/sprints/sprintContextCapacity';
import {
  buildSprintContextAgenda,
  buildSprintContextCalendarDays,
  buildSprintContextWeekendDays,
  collectSprintContextWarnings,
  parseStaffUuidFromAssigneeId,
} from '@/lib/sprints/sprintContextEnrichmentHelpers';
import { loadSprintContextHolidayDays } from '@/lib/sprints/sprintContextHolidays';
import { loadOrgHolidayCountry } from '@/lib/sprints/sprintContextOrgHolidayCountry';
import { buildPlanVsActual } from '@/lib/sprints/sprintContextPlanVsActual';
import {
  loadSprintContextTeamMembers,
  stampCapacityWithTeamRoles,
} from '@/lib/sprints/sprintContextTeamMembers';
import { listStaff } from '@/lib/staffTeams';

interface AssigneeInfo {
  email: string | null;
  name: string;
}

interface IssueInfo {
  createdAt: string | null;
  inSprint: boolean;
  issueType: string | null;
  parentKey: string | null;
  priority: string | null;
  sprintHistory: Array<{ name: string; sprintId: string }>;
  statusDisplay: string | null;
  statusKey: string | null;
  statusTypeKey: string | null;
  summary: string;
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
    createdAt: issue.createdAt?.trim() || null,
    inSprint,
    issueType: issueTypeLabel(issue),
    parentKey: issue.parent?.key?.trim() || null,
    priority: issue.priority?.display?.trim() || issue.priority?.key?.trim() || null,
    sprintHistory: mapSprintHistory(issue.sprint),
    statusDisplay: issue.status?.display?.trim() || null,
    statusKey: issue.status?.key?.trim() || null,
    statusTypeKey: issue.statusType?.key?.trim() || null,
    summary: issue.summary?.trim() || issue.key,
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
        issuesByKey,
        loaded: true,
        warning: `tracker_issues_partial: missing summaries for ${stillMissing.slice(0, 8).join(', ')}${
          stillMissing.length > 8 ? ', …' : ''
        }`,
      };
    }
    return { issuesByKey, loaded: true };
  } catch (error) {
    console.warn(`[sprint-context] soft issues(${input.sprintId}):`, error);
    return {
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
  trackerIssuesLoaded: boolean
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
    issueFound: issue != null,
    issueStatusKey: issue?.statusKey,
    issueStatusTypeKey: issue?.statusTypeKey,
    position,
    sprintStatus,
    trackerIssuesLoaded,
  });
  return { position: next, unresolved: !assignee };
}

/**
 * Attach assignee names, issue summaries, calendarDays, agenda, warnings.
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
      trackerIssuesLoaded
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

  const warnings = collectSprintContextWarnings({
    emptyPlan,
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
  };

  return {
    ...enrichedBase,
    capacity: stampCapacityWithTeamRoles(
      buildSprintContextCapacity(enrichedBase),
      teamMembers
    ),
  };
}
