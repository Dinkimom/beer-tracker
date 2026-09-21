import type { TrackerIssue } from '@/types/tracker';

import { NextResponse } from 'next/server';

import { invalidateCache } from '@/lib/cache';
import { notifySprintRealtimeForSprintIds } from '@/lib/realtime/notifySprintRealtime';
import { isFeatureLaneDraftRowId } from '@/lib/sprints/featureLanesDocument';
import { isTeamSwimlaneAssigneeId } from '@/lib/swimlane/teamSwimlaneAssignee';
import { patchCachedSprintIssueParent, patchCachedSprintIssueStatus } from '@/lib/trackerApi/sprintIssuesCache';

function omitNonTrackerIssueRef(value: string | undefined): string | undefined {
  const key = value?.trim();
  if (!key || isFeatureLaneDraftRowId(key) || isTeamSwimlaneAssigneeId(key)) {
    return undefined;
  }
  return key;
}

export function buildCreateIssueRequestBody(data: {
  assignee?: string;
  description?: string;
  parent?: string;
  priority?: string;
  queue: string;
  sprintId?: number;
  summary: string;
  type?: string;
}) {
  const requestBody: {
    assignee?: string;
    description?: string;
    parent?: string;
    priority?: string;
    queue: string;
    sprint?: number;
    summary: string;
    type?: string;
  } = { summary: data.summary, queue: data.queue };
  if (data.type) requestBody.type = data.type;
  if (data.description) requestBody.description = data.description;
  const assignee = omitNonTrackerIssueRef(data.assignee);
  const parent = omitNonTrackerIssueRef(data.parent);
  if (assignee) requestBody.assignee = assignee;
  if (parent) requestBody.parent = parent;
  if (data.priority) requestBody.priority = data.priority;
  if (data.sprintId) requestBody.sprint = data.sprintId;
  return requestBody;
}

export function trackerParentForIssueUpdate(
  parent: string | null | undefined
): string | null | undefined {
  if (parent === undefined) {
    return undefined;
  }
  if (parent === null) {
    return null;
  }
  return omitNonTrackerIssueRef(parent) ?? undefined;
}

export function sprintIdsFromIssueSprint(sprints: unknown): number[] {
  if (sprints == null) {
    return [];
  }
  const list = Array.isArray(sprints) ? sprints : [sprints];
  return list
    .map((s: string | { id: string }) =>
      typeof s === 'string' ? parseInt(s, 10) : parseInt(s.id, 10)
    )
    .filter((id: number) => !Number.isNaN(id));
}

function invalidateBurndownForSprintIds(
  sprintIds: number[],
  invalidateBurndown: (sprintId: number) => void
): void {
  for (const sprintId of sprintIds) {
    invalidateBurndown(sprintId);
  }
}

export function patchIssueStatusErrorResponse(error: unknown): NextResponse {
  const err = error as { response?: { status?: number; data?: { errorMessages?: string[] } } };
  const status = err?.response?.status;
  const data = err?.response?.data;
  if (status === 422 && data?.errorMessages) {
    return NextResponse.json(
      { error: 'Transition requires fields', errorMessages: data.errorMessages },
      { status: 422 }
    );
  }
  return NextResponse.json(
    { error: 'Failed to update issue status', details: data },
    { status: status && status >= 400 && status < 600 ? status : 500 }
  );
}

function trackerStatusFromKey(statusKey: string): TrackerIssue['status'] {
  return { key: statusKey, display: statusKey };
}

export function completeIssueStatusChange(input: {
  issueKey: string;
  request: Request;
  sprintIds: number[];
  statusKey?: string;
}): void {
  invalidateBurndownForSprintIds(input.sprintIds, invalidateCache.burndown);
  if (input.sprintIds.length === 0) {
    return;
  }

  const statusKey = input.statusKey?.trim();
  if (statusKey) {
    const status = trackerStatusFromKey(statusKey);
    for (const sprintId of input.sprintIds) {
      patchCachedSprintIssueStatus(sprintId, input.issueKey, { status });
    }
  }
  notifySprintRealtimeForSprintIds(input.request, input.sprintIds, ['tasks'], {
    issueStatus: statusKey ? { issueKey: input.issueKey, statusKey } : undefined,
  });
}

function uniqueSprintIds(ids: readonly number[]): number[] {
  const seen = new Set<number>();
  const next: number[] = [];
  for (const id of ids) {
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) {
      continue;
    }
    seen.add(id);
    next.push(id);
  }
  return next;
}

interface PlannerIssueParentSource {
  parent?: { display?: string; id: string; key?: string; self?: string };
  sprint?: unknown;
}

function cachedParentFromTrackerIssue(
  issue: PlannerIssueParentSource | null,
  parentKey: string | null
): TrackerIssue['parent'] | null {
  if (parentKey === null) {
    return null;
  }
  const fromIssue = issue?.parent;
  if (fromIssue) {
    const key = fromIssue.key?.trim() || fromIssue.id;
    return {
      display: fromIssue.display?.trim() || key,
      id: fromIssue.id,
      key,
      self: fromIssue.self ?? '',
    };
  }
  const key = parentKey.trim();
  return key ? { display: key, id: key, key, self: '' } : null;
}

export function completeIssueParentChange(input: {
  issueKey: string;
  parent: TrackerIssue['parent'] | null;
  request: Request;
  sprintIds: number[];
}): void {
  const sprintIds = uniqueSprintIds(input.sprintIds);
  if (sprintIds.length === 0) {
    return;
  }
  for (const sprintId of sprintIds) {
    patchCachedSprintIssueParent(sprintId, input.issueKey, input.parent);
  }
  invalidateCache.issueFull(input.issueKey);
  notifySprintRealtimeForSprintIds(input.request, sprintIds, ['tasks']);
}

export async function syncPlannerIssueParentAfterTrackerUpdate(input: {
  issueKey: string;
  issueTracker: { getIssue: (issueKey: string) => Promise<PlannerIssueParentSource | null> };
  parentKey: string | null;
  request: Request;
  sprintId?: number;
}): Promise<void> {
  let issue: PlannerIssueParentSource | null = null;
  try {
    issue = await input.issueTracker.getIssue(input.issueKey);
  } catch {
    issue = null;
  }
  completeIssueParentChange({
    issueKey: input.issueKey,
    parent: cachedParentFromTrackerIssue(issue, input.parentKey),
    request: input.request,
    sprintIds: [
      ...sprintIdsFromIssueSprint(issue?.sprint),
      ...(input.sprintId ? [input.sprintId] : []),
    ],
  });
}
