import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { normalizePlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';
import { updatePlanPatchPositionPreviewGeometry } from '@/lib/sprints/sprintPlanPatchPositionPreviewRepository';
import {
  approvePlanPatchPositionPreviews,
  rejectPlanPatchPositionPreviews,
} from '@/lib/sprints/sprintPlanPatchPreviewActions';
import { requireSprintRouteContext } from '@/lib/sprints/sprintRouteContext';

const BodySchema = z.object({
  taskId: z.string().trim().min(1).max(255).optional(),
});

const MoveBodySchema = z.object({
  assigneeId: z.string().trim().min(1).max(255),
  changes: z.array(z.enum(['duration', 'schedule', 'segments'])),
  duration: z.number().int().positive(),
  segments: z
    .array(
      z.object({
        duration: z.number().int().positive(),
        startDay: z.number().int().min(0),
        startPart: z.number().int().min(0),
      })
    )
    .optional(),
  startDay: z.number().int().min(0),
  startPart: z.number().int().min(0),
  taskId: z.string().trim().min(1).max(255),
});

function readTaskId(request: NextRequest): string | undefined {
  const taskId = request.nextUrl.searchParams.get('taskId')?.trim();
  return taskId ? taskId : undefined;
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
    const { sprintId } = tenantResult;
    const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }
    const count = await approvePlanPatchPositionPreviews({
      organizationId: tenantResult.ctx.organizationId,
      ownerId: tenantResult.ctx.userId,
      sprintId,
      taskId: parsed.data.taskId,
    });
    if (parsed.data.taskId && count === 0) {
      return NextResponse.json({ error: 'Preview not found' }, { status: 404 });
    }
    notifySprintRealtime(request, tenantResult.ctx.organizationId, sprintId, ['positions']);
    return NextResponse.json({ count, ok: true });
  } catch (error) {
    console.error('Error approving plan patch previews:', error);
    return NextResponse.json({ error: 'Failed to approve plan patch previews' }, { status: 500 });
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
    const { sprintId } = tenantResult;
    const taskId = readTaskId(request);
    const count = await rejectPlanPatchPositionPreviews({
      organizationId: tenantResult.ctx.organizationId,
      ownerId: tenantResult.ctx.userId,
      sprintId,
      taskId,
    });
    if (taskId && count === 0) {
      return NextResponse.json({ error: 'Preview not found' }, { status: 404 });
    }
    notifySprintRealtime(request, tenantResult.ctx.organizationId, sprintId, ['positions']);
    return NextResponse.json({ count, ok: true });
  } catch (error) {
    console.error('Error rejecting plan patch previews:', error);
    return NextResponse.json({ error: 'Failed to reject plan patch previews' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  try {
    const tenantResult = await requireSprintRouteContext(request, params);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { sprintId } = tenantResult;
    const parsed = MoveBodySchema.safeParse(await request.json().catch(() => ({})));
    const preview = parsed.success
      ? normalizePlanPatchPositionPreview({ ...parsed.data, remove: false })
      : null;
    if (!preview) {
      return NextResponse.json({ error: 'Invalid preview' }, { status: 400 });
    }
    const count = await updatePlanPatchPositionPreviewGeometry({
      organizationId: tenantResult.ctx.organizationId,
      ownerId: tenantResult.ctx.userId,
      preview,
      sprintId,
    });
    if (count === 0) {
      return NextResponse.json({ error: 'Preview not found' }, { status: 404 });
    }
    notifySprintRealtime(request, tenantResult.ctx.organizationId, sprintId, ['positions']);
    return NextResponse.json({ count, ok: true });
  } catch (error) {
    console.error('Error moving plan patch preview:', error);
    return NextResponse.json({ error: 'Failed to move plan patch preview' }, { status: 500 });
  }
}
