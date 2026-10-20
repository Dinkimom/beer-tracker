import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import {
  approvePlanPatchPositionPreviews,
  rejectPlanPatchPositionPreviews,
} from '@/lib/sprints/sprintPlanPatchPreviewActions';

const BodySchema = z.object({
  taskId: z.string().trim().min(1).max(255).optional(),
});

async function readSprintId(
  params: Promise<{ sprintId: string }> | { sprintId: string }
): Promise<number> {
  const { sprintId } = await resolveParams(params);
  return parseInt(sprintId, 10);
}

function readTaskId(request: NextRequest): string | undefined {
  const taskId = request.nextUrl.searchParams.get('taskId')?.trim();
  return taskId ? taskId : undefined;
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
    const sprintId = await readSprintId(params);
    if (Number.isNaN(sprintId)) {
      return NextResponse.json({ error: 'Invalid sprint ID' }, { status: 400 });
    }
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
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const sprintId = await readSprintId(params);
    if (Number.isNaN(sprintId)) {
      return NextResponse.json({ error: 'Invalid sprint ID' }, { status: 400 });
    }
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
