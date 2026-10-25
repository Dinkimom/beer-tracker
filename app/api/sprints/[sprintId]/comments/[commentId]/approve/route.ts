import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { approvePendingSprintComment } from '@/lib/sprints/sprintCommentApprove';
import { requireSprintRouteContext } from '@/lib/sprints/sprintRouteContext';

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ commentId: string; sprintId: string }> | { commentId: string; sprintId: string };
  }
) {
  try {
    const tenantResult = await requireSprintRouteContext(request, params);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { sprintId } = tenantResult;
    const { commentId } = tenantResult.params;

    if (!z.string().uuid().safeParse(commentId).success) {
      return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 });
    }

    const result = await approvePendingSprintComment({
      commentId,
      ownerId: tenantResult.ctx.userId,
      sprintId,
    });
    if (result === 'not_found') {
      return NextResponse.json({ error: 'Pending note not found' }, { status: 404 });
    }
    notifySprintRealtime(request, tenantResult.ctx.organizationId, sprintId, ['comments']);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error approving pending comment:', error);
    return NextResponse.json({ error: 'Failed to approve comment' }, { status: 500 });
  }
}
