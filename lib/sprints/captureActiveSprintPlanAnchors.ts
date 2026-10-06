import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';
import type { SprintListItem } from '@/types/tracker';

import { isEphemeralPlannerPositionId } from '@/lib/planner/ephemeralPlannerPositionId';
import { fetchIssueChangelogCacheMap, fetchIssueStatusesTypesAndSummariesFromSnapshots } from '@/lib/snapshots';
import { listTeams } from '@/lib/staffTeams/teamsRepository';

import {
  decidePlanAnchorWrite,
  sprintWindowBounds,
  workStatusChangesFromChangelog,
  type PlanCaptureGeometry,
  type PlanCaptureSegment,
} from './planAnchorCapture';
import {
  insertPlanAnchorIfAbsent,
  listPlanCapturesForSprint,
  upsertPlanDraft,
} from './planAnchorRepository';
import { listTaskPositionsForSprint, loadPositionSegmentsByTask } from './taskPositionsRepository';

interface OpenSprint {
  endMs: number;
  id: number;
  startMs: number;
}

function boardIdsFromTeams(teams: Array<{ tracker_board_id: string }>): number[] {
  const ids = new Set<number>();
  for (const team of teams) {
    const boardId = Number.parseInt(String(team.tracker_board_id), 10);
    if (Number.isFinite(boardId) && boardId > 0) ids.add(boardId);
  }
  return [...ids];
}

function openSprintFromListItem(sprint: SprintListItem): OpenSprint | null {
  if (sprint.archived || sprint.status !== 'in_progress') return null;
  const bounds = sprintWindowBounds(
    sprint.startDateTime || sprint.startDate,
    sprint.endDateTime || sprint.endDate
  );
  if (!bounds) return null;
  return { endMs: bounds.endMs, id: sprint.id, startMs: bounds.startMs };
}

async function listOpenSprints(
  issueTracker: IssueTrackerProviderClient,
  boardIds: number[]
): Promise<OpenSprint[]> {
  const byId = new Map<number, OpenSprint>();
  for (const boardId of boardIds) {
    try {
      const sprints = await issueTracker.listSprints(boardId);
      for (const sprint of sprints) {
        const open = openSprintFromListItem(sprint);
        if (open) byId.set(open.id, open);
      }
    } catch (err) {
      console.error(`[plan-anchor] list sprints board=${boardId}`, err);
    }
  }
  return [...byId.values()];
}

function geometryFromPosition(
  row: Record<string, unknown>,
  segmentRows: Array<{ duration: number; start_day: number; start_part: number }> | undefined
): PlanCaptureGeometry | null {
  if (
    typeof row.assignee_id !== 'string' ||
    typeof row.duration !== 'number' ||
    typeof row.start_day !== 'number' ||
    typeof row.start_part !== 'number'
  ) {
    return null;
  }
  const segments: PlanCaptureSegment[] | null =
    segmentRows && segmentRows.length > 0
      ? segmentRows.map((segment) => ({
          duration: segment.duration,
          startDay: segment.start_day,
          startPart: segment.start_part,
        }))
      : null;
  return {
    assigneeId: row.assignee_id,
    duration: row.duration,
    segments,
    startDay: row.start_day,
    startPart: row.start_part,
  };
}

async function captureOpenSprint(organizationId: string, sprint: OpenSprint): Promise<void> {
  const rows = await listTaskPositionsForSprint({ organizationId, sprintId: sprint.id });
  const positions = rows.filter((row) => !isEphemeralPlannerPositionId(row.task_id));
  if (positions.length === 0) return;

  const taskIds = positions.map((row) => row.task_id);
  const [segmentsByTask, changelogs, snapshotMeta, captures] = await Promise.all([
    loadPositionSegmentsByTask(sprint.id),
    fetchIssueChangelogCacheMap(organizationId, taskIds),
    fetchIssueStatusesTypesAndSummariesFromSnapshots(organizationId, taskIds),
    listPlanCapturesForSprint({ organizationId, sprintId: sprint.id }),
  ]);

  for (const row of positions) {
    const position = geometryFromPosition(row, segmentsByTask.get(row.task_id));
    if (!position) continue;
    const decision = decidePlanAnchorWrite({
      currentStatusKey: snapshotMeta.statuses.get(row.task_id) ?? null,
      draft: captures.drafts.get(row.task_id) ?? null,
      hasAnchor: captures.anchors.has(row.task_id),
      position,
      sprintEndMs: sprint.endMs,
      sprintStartMs: sprint.startMs,
      workStatusChanges: workStatusChangesFromChangelog(
        changelogs.get(row.task_id)?.changelog ?? []
      ),
    });
    if (!decision) continue;
    if (decision.type === 'draft') {
      await upsertPlanDraft({
        geometry: decision.geometry,
        organizationId,
        sprintId: sprint.id,
        taskId: row.task_id,
      });
      continue;
    }
    await insertPlanAnchorIfAbsent({
      anchoredAt: new Date(decision.anchoredAtMs),
      geometry: decision.geometry,
      organizationId,
      sprintId: sprint.id,
      taskId: row.task_id,
    });
  }
}

async function captureActiveSprintPlanAnchors(input: {
  issueTracker: IssueTrackerProviderClient;
  organizationId: string;
}): Promise<void> {
  const teams = await listTeams(input.organizationId, { activeOnly: true });
  const sprints = await listOpenSprints(input.issueTracker, boardIdsFromTeams(teams));
  for (const sprint of sprints) {
    await captureOpenSprint(input.organizationId, sprint);
  }
}

export async function captureActiveSprintPlanAnchorsQuietly(input: {
  issueTracker: IssueTrackerProviderClient;
  organizationId: string;
}): Promise<void> {
  try {
    await captureActiveSprintPlanAnchors(input);
  } catch (err) {
    console.error('[plan-anchor] capture failed', err);
  }
}
