import type { BatchPositionsSchema } from '@/lib/validation';
import type { PhaseSegment } from '@/types';
import type { NextRequest } from 'next/server';
import type { z } from 'zod';

import { getTrackerApiFromRequest } from '@/lib/api-tracker';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import {
  getPlannedCellRangeDateRange,
  getPlannedPositionCellRange,
} from '@/lib/planner-timeline';
import { buildSyntheticQaTaskId } from '@/lib/qaTaskIdentity';
import { resolvePlannerAssigneeIdForTrackerSync, resolvePlannerAssigneeIdsForTrackerSync } from '@/lib/staffTeams/resolvePlannerAssigneeForTrackerSync';
import { fetchSprintInfo } from '@/lib/trackerApi';
import { loadTrackerIntegrationForTrackerPatch } from '@/lib/trackerIntegration';
import { buildIssueAssigneePatch } from '@/lib/trackerIntegration/buildIssueAssigneePatch';
import { resolveSprintTimelineWorkingDaysCount } from '@/utils/dateUtils';

import {
  loadPersistedPositionsForPlannedSync,
  type PersistedPositionForSync,
  type TaskPositionSegmentInput,
} from './taskPositionsRepository';

interface PlannedDateSyncPosition {
  devTaskKey?: string;
  duration: number;
  isQa?: boolean | null;
  plannedDuration?: number | null;
  plannedStartDay?: number | null;
  plannedStartPart?: number | null;
  segments?: PhaseSegment[] | null;
  taskId: string;
}

type BatchPosition = z.infer<typeof BatchPositionsSchema>['positions'][number];

function toIsoDateOnlyLocal(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addGroupTaskId(groups: Map<string, Set<string>>, issueKey: string, taskId: string): void {
  const group = groups.get(issueKey) ?? new Set<string>();
  group.add(taskId);
  groups.set(issueKey, group);
}

function buildIssueTaskGroups(positions: PlannedDateSyncPosition[]): Map<string, Set<string>> {
  const groups = new Map<string, Set<string>>();

  positions.forEach((position) => {
    if (!getPlannedPositionCellRange(position)) {
      return;
    }

    const isSyntheticQa = position.isQa && position.devTaskKey;
    const issueKey = isSyntheticQa ? position.devTaskKey! : position.taskId;

    addGroupTaskId(groups, issueKey, position.taskId);

    if (isSyntheticQa) {
      addGroupTaskId(groups, issueKey, issueKey);
    } else if (!position.isQa) {
      addGroupTaskId(groups, issueKey, buildSyntheticQaTaskId(issueKey));
    }
  });

  return groups;
}

async function syncPlannedDatesToTracker({
  positions,
  request,
  sprintId,
}: {
  positions: PlannedDateSyncPosition[];
  request: Request;
  sprintId: number;
}): Promise<void> {
  const groups = buildIssueTaskGroups(positions);
  if (groups.size === 0) {
    return;
  }

  const relatedTaskIds = Array.from(new Set(Array.from(groups.values()).flatMap((ids) => [...ids])));
  const persistedPositions = await loadPersistedPositionsForPlannedSync(sprintId, relatedTaskIds);
  const trackerApi = await getTrackerApiFromRequest(request);
  const sprintInfo = await fetchSprintInfo(sprintId, trackerApi);
  const sprintStartDate = new Date(sprintInfo.startDate);
  sprintStartDate.setHours(0, 0, 0, 0);
  const workingDaysCount = resolveSprintTimelineWorkingDaysCount(
    sprintInfo.startDate,
    sprintInfo.endDate,
    10
  );

  await Promise.all(
    Array.from(groups.entries()).map(async ([issueKey, taskIds]) => {
      const ranges = Array.from(taskIds)
        .map((taskId) => persistedPositions.get(taskId))
        .filter((position): position is PersistedPositionForSync => position != null)
        .map((position) => getPlannedPositionCellRange(position))
        .filter((range): range is { endCell: number; startCell: number } => range != null);

      if (ranges.length === 0) {
        return;
      }

      const dateRange = getPlannedCellRangeDateRange(
        {
          endCell: Math.max(...ranges.map((range) => range.endCell)),
          startCell: Math.min(...ranges.map((range) => range.startCell)),
        },
        sprintStartDate,
        workingDaysCount
      );

      if (!dateRange) {
        return;
      }

      const start = toIsoDateOnlyLocal(dateRange.startDate);
      const deadline = toIsoDateOnlyLocal(dateRange.endDate);
      try {
        await trackerApi.patch(`/issues/${issueKey}`, { deadline, start });
      } catch {
        await trackerApi.patch(`/issues/${issueKey}`, { deadline });
      }
    })
  );
}

export async function trySyncPositionAssigneeToTracker(input: {
  assigneeId: string;
  devTaskKey: string | undefined;
  isQa: boolean | undefined;
  logLabel: string;
  organizationId: string;
  request: NextRequest;
  syncAssignee?: boolean;
  taskId: string;
}): Promise<void> {
  if (input.syncAssignee === false) {
    return;
  }

  const trackerAssigneeId = await resolvePlannerAssigneeIdForTrackerSync(
    input.organizationId,
    input.assigneeId
  );
  if (!trackerAssigneeId) {
    return;
  }

  try {
    const issueTracker = await getIssueTrackerProviderClientFromRequest(input.request);
    const integration = await loadTrackerIntegrationForTrackerPatch(input.organizationId);
    const issueKeyToUpdate = input.isQa && input.devTaskKey ? input.devTaskKey : input.taskId;
    const patch = buildIssueAssigneePatch(trackerAssigneeId, input.isQa ?? false, integration);
    await issueTracker.updateIssue(issueKeyToUpdate, patch);
  } catch (err) {
    console.error(`[sync assignee → tracker] ${input.logLabel}`, err);
  }
}

export async function trySyncPositionPlannedDates(input: {
  devTaskKey: string | undefined;
  duration: number;
  isQa: boolean | undefined;
  logLabel: string;
  organizationId: string;
  plannedDuration: number | null | undefined;
  plannedStartDay: number | null | undefined;
  plannedStartPart: number | null | undefined;
  request: NextRequest;
  segments?: TaskPositionSegmentInput[];
  sprintId: number;
  taskId: string;
}): Promise<void> {
  if (input.plannedStartDay == null || input.plannedStartPart == null) {
    return;
  }

  try {
    await syncPlannedDatesToTracker({
      positions: [
        {
          devTaskKey: input.devTaskKey,
          duration: input.duration,
          isQa: input.isQa,
          plannedDuration: input.plannedDuration,
          plannedStartDay: input.plannedStartDay,
          plannedStartPart: input.plannedStartPart,
          segments: input.segments,
          taskId: input.taskId,
        },
      ],
      request: input.request,
      sprintId: input.sprintId,
    });
  } catch (err) {
    console.error(`[sync planned dates → tracker] ${input.logLabel}`, err);
  }
}

export async function syncPutPositionSideEffects(input: {
  assigneeId: unknown;
  devTaskKey: string | undefined;
  duration: unknown;
  isQa: boolean;
  organizationId: string;
  plannedDuration: unknown;
  plannedStartDay: unknown;
  plannedStartPart: unknown;
  request: NextRequest;
  sprintId: number;
  taskId: string;
}): Promise<void> {
  if (input.assigneeId != null) {
    await trySyncPositionAssigneeToTracker({
      assigneeId: input.assigneeId as string,
      devTaskKey: input.devTaskKey,
      isQa: input.isQa,
      logLabel: 'PUT /sprints/.../positions',
      organizationId: input.organizationId,
      request: input.request,
      taskId: input.taskId,
    });
  }

  await trySyncPositionPlannedDates({
    devTaskKey: input.devTaskKey,
    duration: input.duration as number,
    isQa: input.isQa,
    logLabel: 'PUT /sprints/.../positions',
    organizationId: input.organizationId,
    plannedDuration: input.plannedDuration as number | null | undefined,
    plannedStartDay: input.plannedStartDay as number | null | undefined,
    plannedStartPart: input.plannedStartPart as number | null | undefined,
    request: input.request,
    sprintId: input.sprintId,
    taskId: input.taskId,
  });
}

export async function syncBatchAssigneesToTracker(input: {
  organizationId: string;
  positions: BatchPosition[];
  request: NextRequest;
}): Promise<void> {
  const toSync = input.positions.filter((pos) => pos.syncAssignee ?? true);
  if (toSync.length === 0) {
    return;
  }

  try {
    const resolved = await resolvePlannerAssigneeIdsForTrackerSync(
      input.organizationId,
      toSync.map((p) => p.assigneeId)
    );
    const issueTracker = await getIssueTrackerProviderClientFromRequest(input.request);
    const integration = await loadTrackerIntegrationForTrackerPatch(input.organizationId);
    await Promise.all(
      toSync.map(async (pos) => {
        const trackerAssigneeId = resolved.get(pos.assigneeId);
        if (!trackerAssigneeId) {
          return;
        }
        const issueKeyToUpdate = pos.isQa && pos.devTaskKey ? pos.devTaskKey : pos.taskId;
        const isQa = pos.isQa ?? false;
        const patch = buildIssueAssigneePatch(trackerAssigneeId, isQa, integration);
        try {
          await issueTracker.updateIssue(issueKeyToUpdate, patch);
        } catch (err) {
          console.error(
            `[sync assignee → tracker] Failed to update assignee for ${issueKeyToUpdate}:`,
            err
          );
        }
      })
    );
  } catch (err) {
    console.error('[sync assignee → tracker] POST /sprints/.../positions/batch', err);
  }
}

export async function syncBatchPlannedDatesToTracker(input: {
  organizationId: string;
  positions: BatchPosition[];
  request: NextRequest;
  sprintId: number;
}): Promise<void> {
  const toSyncDates = input.positions.filter(
    (pos) => pos.plannedStartDay != null && pos.plannedStartPart != null
  );
  if (toSyncDates.length === 0) {
    return;
  }

  try {
    await syncPlannedDatesToTracker({
      positions: toSyncDates,
      request: input.request,
      sprintId: input.sprintId,
    });
  } catch (err) {
    console.error('[sync planned dates → tracker] POST /sprints/.../positions/batch', err);
  }
}
