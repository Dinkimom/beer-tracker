import { NextRequest, NextResponse } from 'next/server';

import { TRACKER_UPSTREAM_FORWARD_STATUSES, handleApiError } from '@/lib/api-error-handler';
import { getTrackerApiFromRequest } from '@/lib/api-tracker';
import { notifyAssigneeChangedIfNeeded } from '@/lib/notifications/notifyAssigneeChangedIfNeeded';
import { isEphemeralPlannerPositionId } from '@/lib/planner/ephemeralPlannerPositionId';
import { plannerGridPartError } from '@/lib/planner/migrateOrganizationPlannerGrid';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import {
  attachSegmentsToPositions,
  deleteTaskPosition,
  getTaskPositionAssigneeId,
  listTaskPositionsForSprint,
  loadPositionSegmentsByTask,
  replaceTaskPositionSegments,
  syncPutPositionSideEffects,
  trySyncPlannedDatesAfterPositionDelete,
  trySyncPositionAssigneeToTracker,
  trySyncPositionPlannedDates,
  withTrackerSyncFailures,
  updateTaskPositionRecord,
  upsertTaskPositionRecord,
} from '@/lib/sprints';
import { listPlanAnchorsForSprint } from '@/lib/sprints/planAnchorRepository';
import { listPlanPatchPositionPreviews } from '@/lib/sprints/sprintPlanPatchPositionPreviewRepository';
import { requireSprintRouteContext } from '@/lib/sprints/sprintRouteContext';
import { listSwimlaneCardLayers } from '@/lib/sprints/swimlaneCardLayersRepository';
import { resolveTrackerSprintBoardId } from '@/lib/trackerApi';
import { TaskPositionSchema, formatValidationError, validateRequest } from '@/lib/validation';

function resolveAssigneeNotificationBoardId(request: NextRequest, sprintId: number) {
  return async (): Promise<number | undefined> => {
    try {
      const trackerApi = await getTrackerApiFromRequest(request);
      return resolveTrackerSprintBoardId(sprintId, trackerApi);
    } catch {
      return undefined;
    }
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  try {
    const tenantResult = await requireSprintRouteContext(request, params);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;
    const { sprintId } = tenantResult;

    const positions = await listTaskPositionsForSprint({ organizationId, sprintId });
    if (positions.length > 0) {
      const segmentsByTask = await loadPositionSegmentsByTask(sprintId);
      attachSegmentsToPositions(positions, segmentsByTask);
    }
    const planAnchors = await listPlanAnchorsForSprint({ organizationId, sprintId });
    const planPatchPreviews = await listPlanPatchPositionPreviews({
      organizationId,
      ownerId: tenantResult.ctx.userId,
      sprintId,
    });

    const laneLayers = await listSwimlaneCardLayers({ organizationId, sprintId });

    return NextResponse.json({ laneLayers, planAnchors, planPatchPreviews, positions });
  } catch (error) {
    return handleApiError(error, 'fetch positions', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  try {
    const tenantResult = await requireSprintRouteContext(request, params);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;
    const actorUserId = tenantResult.ctx.userId;
    const { sprintId } = tenantResult;

    const body = await request.json();

    const validation = validateRequest(TaskPositionSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error)
        },
        { status: 400 }
      );
    }

    const {
      taskId,
      assigneeId,
      startDay,
      startPart,
      duration,
      plannedStartDay,
      plannedStartPart,
      plannedDuration,
      isQa,
      devTaskKey,
      segments,
      syncAssignee,
    } = validation.data;

    const gridError = await plannerGridPartError(organizationId, [
      startPart,
      plannedStartPart,
      ...(segments?.map((segment) => segment.startPart) ?? []),
    ]);
    if (gridError) {
      return NextResponse.json({ error: gridError }, { status: 400 });
    }

    const previousAssigneeId = await getTaskPositionAssigneeId({
      organizationId,
      sprintId,
      taskId,
    });

    const result = await upsertTaskPositionRecord({
      assigneeId,
      duration,
      isQa,
      organizationId,
      plannedDuration,
      plannedStartDay,
      plannedStartPart,
      sprintId,
      startDay,
      startPart,
      taskId,
    });

    await replaceTaskPositionSegments({
      organizationId,
      segments,
      sprintId,
      taskId,
    });

    const trackerSyncFailures = await trySyncPositionAssigneeToTracker({
      assigneeId,
      devTaskKey,
      isQa,
      logLabel: 'POST /sprints/.../positions',
      organizationId,
      request,
      syncAssignee,
      taskId,
    });

    trackerSyncFailures.push(...await trySyncPositionPlannedDates({
      devTaskKey,
      duration,
      isQa,
      logLabel: 'POST /sprints/.../positions',
      organizationId,
      plannedDuration,
      plannedStartDay,
      plannedStartPart,
      request,
      segments,
      sprintId,
      taskId,
    }));

    notifySprintRealtime(request, organizationId, sprintId, ['positions']);
    notifyAssigneeChangedIfNeeded({
      actorUserId,
      assigneeId,
      organizationId,
      previousAssigneeId,
      resolveBoardId: resolveAssigneeNotificationBoardId(request, sprintId),
      sprintId,
      taskId,
    });
    return NextResponse.json(
      withTrackerSyncFailures({ position: result.rows[0] }, trackerSyncFailures)
    );
  } catch (error) {
    return handleApiError(error, 'save position', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  try {
    const tenantResult = await requireSprintRouteContext(request, params);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;
    const actorUserId = tenantResult.ctx.userId;
    const { sprintId } = tenantResult;
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    // Аннотации и черновики не хранят место в task_positions (см. TaskPositionSchema).
    if (!taskId || isEphemeralPlannerPositionId(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { assigneeId, startDay, startPart, duration, plannedStartDay, plannedStartPart, plannedDuration, devTaskKey } = body;

    const previousAssigneeId =
      assigneeId != null
        ? await getTaskPositionAssigneeId({
            organizationId,
            sprintId,
            taskId,
          })
        : null;

    const result = await updateTaskPositionRecord({
      assigneeId,
      duration,
      organizationId,
      plannedDuration,
      plannedStartDay,
      plannedStartPart,
      sprintId,
      startDay,
      startPart,
      taskId,
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Position not found' },
        { status: 404 }
      );
    }

    const isQa = result.rows[0]?.is_qa ?? false;

    const trackerSyncFailures = await syncPutPositionSideEffects({
      assigneeId,
      devTaskKey,
      duration,
      isQa,
      organizationId,
      plannedDuration,
      plannedStartDay,
      plannedStartPart,
      request,
      sprintId,
      taskId,
    });

    notifySprintRealtime(request, organizationId, sprintId, ['positions']);
    notifyAssigneeChangedIfNeeded({
      actorUserId,
      assigneeId,
      organizationId,
      previousAssigneeId,
      resolveBoardId: resolveAssigneeNotificationBoardId(request, sprintId),
      sprintId,
      taskId,
    });
    return NextResponse.json(
      withTrackerSyncFailures({ position: result.rows[0] }, trackerSyncFailures)
    );
  } catch (error) {
    return handleApiError(error, 'update position', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  try {
    const tenantResult = await requireSprintRouteContext(request, params);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;
    const { sprintId } = tenantResult;
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const isQaParam = searchParams.get('isQa');
    const isQa = isQaParam === '1' || isQaParam === 'true';
    const devTaskKey = searchParams.get('devTaskKey')?.trim() || undefined;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    await deleteTaskPosition({ organizationId, sprintId, taskId });

    const trackerSyncFailures = await trySyncPlannedDatesAfterPositionDelete({
      ...(devTaskKey ? { devTaskKey } : {}),
      isQa,
      logLabel: 'DELETE /sprints/.../positions',
      request,
      sprintId,
      taskId,
    });

    notifySprintRealtime(request, organizationId, sprintId, ['positions']);
    return NextResponse.json(withTrackerSyncFailures({ success: true }, trackerSyncFailures));
  } catch (error) {
    return handleApiError(error, 'delete position', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
