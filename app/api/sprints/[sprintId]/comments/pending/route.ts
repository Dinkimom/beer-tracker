import { NextRequest, NextResponse } from 'next/server';

import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import {
  approveAllPendingSprintComments,
  rejectAllPendingSprintComments,
} from '@/lib/sprints/sprintCommentApprove';
import { requireSprintRouteContext } from '@/lib/sprints/sprintRouteContext';

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
    const count = await approveAllPendingSprintComments({
      ownerId: tenantResult.ctx.userId,
      sprintId,
    });
    notifySprintRealtime(request, tenantResult.ctx.organizationId, sprintId, ['comments']);
    return NextResponse.json({ count, ok: true });
  } catch (error) {
    console.error('Error approving pending comments:', error);
    return NextResponse.json({ error: 'Failed to approve comments' }, { status: 500 });
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
    const count = await rejectAllPendingSprintComments({
      ownerId: tenantResult.ctx.userId,
      sprintId,
    });
    notifySprintRealtime(request, tenantResult.ctx.organizationId, sprintId, ['comments']);
    return NextResponse.json({ count, ok: true });
  } catch (error) {
    console.error('Error rejecting pending comments:', error);
    return NextResponse.json({ error: 'Failed to reject comments' }, { status: 500 });
  }
}
