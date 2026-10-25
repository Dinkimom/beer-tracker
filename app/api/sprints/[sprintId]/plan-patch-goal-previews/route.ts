import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import {
  approvePlanPatchGoalPreviews,
  rejectPlanPatchGoalPreviews,
} from '@/lib/sprints/sprintPlanPatchGoalPreviewActions';
import { requireSprintRouteContext } from '@/lib/sprints/sprintRouteContext';

const BodySchema = z.object({
  goalId: z.string().uuid().optional(),
});

function readGoalId(request: NextRequest): string | undefined {
  const goalId = request.nextUrl.searchParams.get('goalId')?.trim();
  return goalId ? goalId : undefined;
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
      return NextResponse.json({ error: 'Invalid goal ID' }, { status: 400 });
    }
    const count = await approvePlanPatchGoalPreviews({
      goalId: parsed.data.goalId,
      organizationId: tenantResult.ctx.organizationId,
      ownerId: tenantResult.ctx.userId,
      sprintId,
    });
    if (parsed.data.goalId && count === 0) {
      return NextResponse.json({ error: 'Preview not found' }, { status: 404 });
    }
    notifySprintRealtime(request, tenantResult.ctx.organizationId, sprintId, ['goals']);
    return NextResponse.json({ count, ok: true });
  } catch (error) {
    console.error('Error approving plan patch goal previews:', error);
    return NextResponse.json({ error: 'Failed to approve plan patch goal previews' }, { status: 500 });
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
    const parsed = BodySchema.safeParse({ goalId: readGoalId(request) });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid goal ID' }, { status: 400 });
    }
    const count = await rejectPlanPatchGoalPreviews({
      goalId: parsed.data.goalId,
      organizationId: tenantResult.ctx.organizationId,
      ownerId: tenantResult.ctx.userId,
      sprintId,
    });
    if (parsed.data.goalId && count === 0) {
      return NextResponse.json({ error: 'Preview not found' }, { status: 404 });
    }
    notifySprintRealtime(request, tenantResult.ctx.organizationId, sprintId, ['goals']);
    return NextResponse.json({ count, ok: true });
  } catch (error) {
    console.error('Error rejecting plan patch goal previews:', error);
    return NextResponse.json({ error: 'Failed to reject plan patch goal previews' }, { status: 500 });
  }
}
