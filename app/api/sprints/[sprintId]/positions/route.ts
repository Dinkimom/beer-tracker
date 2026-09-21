import { NextRequest, NextResponse } from 'next/server';

import { TRACKER_UPSTREAM_FORWARD_STATUSES, handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { getTrackerApiFromRequest } from '@/lib/api-tracker';
import { resolveParams } from '@/lib/nextjs-utils';
import { notifyAssigneeChangedIfNeeded } from '@/lib/notifications/notifyAssigneeChangedIfNeeded';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import {
  attachSegmentsToPositions,
  deleteTaskPosition,
  getTaskPositionAssigneeId,
  listTaskPositionsForSprint,
  loadPositionSegmentsByTask,
  replaceTaskPositionSegments,
  syncPutPositionSideEffects,
  trySyncPositionAssigneeToTracker,
  trySyncPositionPlannedDates,
  updateTaskPositionRecord,
  upsertTaskPositionRecord,
} from '@/lib/sprints';
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
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;
    const { sprintId: sprintIdStr } = await resolveParams(params);
    const sprintId = parseInt(sprintIdStr, 10);

    if (isNaN(sprintId)) {
      return NextResponse.json(
        { error: 'Invalid sprint ID' },
        { status: 400 }
      );
    }

    const positions = await listTaskPositionsForSprint({ organizationId, sprintId });
    if (positions.length > 0) {
      const segmentsByTask = await loadPositionSegmentsByTask(sprintId);
      attachSegmentsToPositions(positions, segmentsByTask);
    }

    return NextResponse.json({ positions });
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
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;
    const actorUserId = tenantResult.ctx.userId;
    const { sprintId: sprintIdStr } = await resolveParams(params);
    const sprintId = parseInt(sprintIdStr, 10);

    if (isNaN(sprintId)) {
      return NextResponse.json(
        { error: 'Invalid sprint ID' },
        { status: 400 }
      );
    }

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

    await trySyncPositionAssigneeToTracker({
      assigneeId,
      devTaskKey,
      isQa,
      logLabel: 'POST /sprints/.../positions',
      organizationId,
      request,
      syncAssignee,
      taskId,
    });

    await trySyncPositionPlannedDates({
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
    return NextResponse.json({ position: result.rows[0] });
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
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;
    const actorUserId = tenantResult.ctx.userId;
    const { sprintId: sprintIdStr } = await resolveParams(params);
    const sprintId = parseInt(sprintIdStr, 10);
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (isNaN(sprintId) || !taskId) {
      return NextResponse.json(
        { error: 'Invalid sprint ID or task ID' },
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

    await syncPutPositionSideEffects({
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
    return NextResponse.json({ position: result.rows[0] });
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
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;
    const { sprintId: sprintIdStr } = await resolveParams(params);
    const sprintId = parseInt(sprintIdStr, 10);
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (isNaN(sprintId) || !taskId) {
      return NextResponse.json(
        { error: 'Invalid sprint ID or task ID' },
        { status: 400 }
      );
    }

    await deleteTaskPosition({ organizationId, sprintId, taskId });

    notifySprintRealtime(request, organizationId, sprintId, ['positions']);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'delete position', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
