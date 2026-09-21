import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { approvePendingSprintComment } from '@/lib/sprints/sprintCommentApprove';

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ commentId: string; sprintId: string }> | { commentId: string; sprintId: string };
  }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { commentId, sprintId: sprintIdStr } = await resolveParams(params);
    const sprintId = parseInt(sprintIdStr, 10);
    if (Number.isNaN(sprintId) || !z.string().uuid().safeParse(commentId).success) {
      return NextResponse.json({ error: 'Invalid sprint ID or comment ID' }, { status: 400 });
    }

    const result = await approvePendingSprintComment({ commentId, sprintId });
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
