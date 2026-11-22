import type { IssueTrackerIssue, IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';
import type { Task } from '@/types';
import type { TrackerIssue } from '@/types/tracker';

import { invalidateCache } from '@/lib/cache';
import { buildTrackerIssueFromProviderIssue } from '@/lib/issueTrackerProvider/yandexTrackerIssueMappingHelpers';
import { notifySprintRealtimeForSprintIds } from '@/lib/realtime/notifySprintRealtime';
import { upsertIssueSnapshotsForOrg } from '@/lib/snapshots';
import { clearIssueCards, closedSprintIdsOf } from '@/lib/sprints/issueBoardCards';
import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';
import {
  removeCachedSprintIssue,
  upsertCachedSprintIssue,
} from '@/lib/trackerApi/sprintIssuesCache';
import { loadTrackerIntegrationForOrganization } from '@/lib/trackerIntegration';

function uniquePositiveSprintIds(sprintIds: readonly number[]): number[] {
  const seen = new Set<number>();
  for (const sprintId of sprintIds) {
    if (!Number.isInteger(sprintId) || sprintId <= 0 || seen.has(sprintId)) {
      continue;
    }
    seen.add(sprintId);
  }
  return [...seen];
}

type MembershipIssueTracker = Pick<IssueTrackerProviderClient, 'getIssue' | 'getSprint' | 'mapIssueToTask' | 'organizationId'>;

interface AddedIssueSnapshot {
  provider: IssueTrackerIssue['provider'];
  task: Task;
  trackerIssue: TrackerIssue;
}

async function loadAddedIssueSnapshot(
  issueTracker: MembershipIssueTracker,
  issueKey: string,
  request: Request
): Promise<AddedIssueSnapshot | null> {
  let issue: IssueTrackerIssue | null;
  try {
    issue = await issueTracker.getIssue(issueKey);
  } catch {
    return null;
  }
  if (!issue) {
    return null;
  }
  const organizationId = request.headers.get(TENANT_ORG_HEADER)?.trim();
  const integration = organizationId
    ? await loadTrackerIntegrationForOrganization(organizationId)
    : null;
  return {
    provider: issue.provider,
    task: issueTracker.mapIssueToTask(issue, integration),
    trackerIssue: buildTrackerIssueFromProviderIssue(issue),
  };
}

export async function completeIssueSprintMembershipChange(input: {
  addedSprintIds: readonly number[];
  issueKey: string;
  issueTracker: MembershipIssueTracker;
  removedSprintIds: readonly number[];
  request: Request;
}): Promise<void> {
  const addedSprintIds = uniquePositiveSprintIds(input.addedSprintIds);
  const removedSprintIds = uniquePositiveSprintIds(input.removedSprintIds).filter(
    (sprintId) => !addedSprintIds.includes(sprintId)
  );
  const affectedSprintIds = uniquePositiveSprintIds([...addedSprintIds, ...removedSprintIds]);
  for (const sprintId of affectedSprintIds) {
    invalidateCache.burndown(sprintId);
  }
  if (affectedSprintIds.length === 0) {
    return;
  }

  // Задача из трекера после смены спринта: снимок в Postgres по ней отбирает бэклог — без
  // обновления бэклог видел бы старый спринт до следующей синхронизации.
  const snapshot = await loadAddedIssueSnapshot(input.issueTracker, input.issueKey, input.request);
  if (snapshot) {
    await upsertIssueSnapshotsForOrg(input.issueTracker.organizationId, [snapshot.trackerIssue], {
      provider: snapshot.provider,
    }).catch((error) => console.error('Failed to refresh issue snapshot after sprint change:', error));
  }
  const addedTask = addedSprintIds.length > 0 ? snapshot?.task : undefined;
  if (snapshot && addedSprintIds.length > 0) {
    for (const sprintId of addedSprintIds) {
      upsertCachedSprintIssue(input.issueTracker.organizationId, sprintId, snapshot.trackerIssue);
    }
  }
  for (const sprintId of removedSprintIds) {
    removeCachedSprintIssue(input.issueTracker.organizationId, sprintId, input.issueKey);
  }

  notifySprintRealtimeForSprintIds(input.request, addedSprintIds, ['tasks'], {
    issueMembership: {
      action: 'added',
      issueKey: input.issueKey,
      ...(addedTask ? { task: addedTask } : {}),
    },
  });
  notifySprintRealtimeForSprintIds(input.request, removedSprintIds, ['tasks'], {
    issueMembership: { action: 'removed', issueKey: input.issueKey },
  });

  // Задача ушла из незакрытого спринта — её карточка и стрелки с его доски уходят (K4, K8).
  const closed = await closedSprintIdsOf(input.issueTracker, removedSprintIds);
  await clearIssueCards({
    issueKey: input.issueKey,
    organizationId: input.issueTracker.organizationId,
    request: input.request,
    sprintIds: removedSprintIds.filter((sprintId) => !closed.has(sprintId)),
  });
}

/** Создание задачи сразу в спринте (quick-add / «Добавить задачу») — тот же кэш и SSE, что у add-to-sprint. */
export async function completeCreatedIssueInSprint(input: {
  issueKey: string;
  issueTracker: MembershipIssueTracker;
  request: Request;
  sprintId: number | null | undefined;
}): Promise<void> {
  const issueKey = input.issueKey.trim();
  if (
    !issueKey ||
    input.sprintId == null ||
    !Number.isInteger(input.sprintId) ||
    input.sprintId <= 0
  ) {
    return;
  }
  await completeIssueSprintMembershipChange({
    addedSprintIds: [input.sprintId],
    issueKey,
    issueTracker: input.issueTracker,
    removedSprintIds: [],
    request: input.request,
  });
}
