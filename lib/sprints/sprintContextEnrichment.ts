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
import { buildSprintContextCapacity } from '@/lib/sprints/sprintContextCapacity';
import {
  buildSprintContextAgenda,
  buildSprintContextCalendarDays,
  collectSprintContextWarnings,
  parseStaffUuidFromAssigneeId,
} from '@/lib/sprints/sprintContextEnrichmentHelpers';
import { listStaff } from '@/lib/staffTeams';

interface AssigneeInfo {
  email: string | null;
  name: string;
}

interface IssueInfo {
  issueType: string | null;
  parentKey: string | null;
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

function mapIssuesByKey(issues: IssueTrackerIssue[]): Map<string, IssueInfo> {
  const map = new Map<string, IssueInfo>();
  for (const issue of issues) {
    if (!issue.key) {
      continue;
    }
    map.set(issue.key, {
      issueType: issueTypeLabel(issue),
      parentKey: issue.parent?.key?.trim() || null,
      summary: issue.summary?.trim() || issue.key,
    });
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
}): Promise<{ issuesByKey: Map<string, IssueInfo>; warning?: string }> {
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
            issuesByKey.set(issue.key, {
              issueType: issueTypeLabel(issue),
              parentKey: issue.parent?.key?.trim() || null,
              summary: issue.summary?.trim() || issue.key,
            });
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
        warning: `tracker_issues_partial: missing summaries for ${stillMissing.slice(0, 8).join(', ')}${
          stillMissing.length > 8 ? ', …' : ''
        }`,
      };
    }
    return { issuesByKey };
  } catch (error) {
    console.warn(`[sprint-context] soft issues(${input.sprintId}):`, error);
    return {
      issuesByKey: new Map(),
      warning: `tracker_issues_unavailable: could not load issue summaries for sprint ${input.sprintId}`,
    };
  }
}

function enrichPosition(
  position: SprintContextPosition,
  lookup: ReturnType<typeof buildAssigneeLookup>,
  issuesByKey: Map<string, IssueInfo>
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
  }
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

  const { issuesByKey, warning: issuesWarning } = await softLoadSprintIssues({
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
  const positions = input.payload.positions.map((position) => {
    const { position: next, unresolved } = enrichPosition(position, lookup, issuesByKey);
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
  if (
    input.payload.meta.sprintWindow?.startDate &&
    input.payload.meta.sprintWindow?.endDate &&
    calendarDays.length === 0
  ) {
    softWarnings.push('calendar_days_unavailable: could not map working days from sprint window');
  }

  const agenda = buildSprintContextAgenda(positions, calendarDays);
  const emptyPlan =
    positions.length === 0 &&
    notes.length === 0 &&
    input.payload.taskLinks.length === 0 &&
    input.payload.sprintGoals.delivery.length === 0 &&
    input.payload.sprintGoals.discovery.length === 0;

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
      ...(warnings.length > 0 ? { warnings } : {}),
    },
    notes,
    positions,
  };

  return {
    ...enrichedBase,
    capacity: buildSprintContextCapacity(enrichedBase),
  };
}
