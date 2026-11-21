import { NextRequest, NextResponse } from 'next/server';

import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import {
  approveAllPendingSprintComments,
  rejectAllPendingSprintComments,
} from '@/lib/sprints/sprintCommentApprove';
import { requireSprintRouteContext } from '@/lib/sprints/sprintRouteContext';

type SprintParams = Promise<{ sprintId: string }> | { sprintId: string };

/** Все черновые заметки автора в спринте: принять (POST) или отклонить (DELETE). */
async function resolveAllPending(
  request: NextRequest,
  params: SprintParams,
  action: { run: typeof approveAllPendingSprintComments; verb: 'approve' | 'reject' }
) {
  try {
    const tenantResult = await requireSprintRouteContext(request, params);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { sprintId } = tenantResult;
    const { organizationId, userId } = tenantResult.ctx;
    const count = await action.run({ organizationId, ownerId: userId, sprintId });
    notifySprintRealtime(request, organizationId, sprintId, ['comments']);
    return NextResponse.json({ count, ok: true });
  } catch (error) {
    console.error(`Error ${action.verb === 'approve' ? 'approving' : 'rejecting'} pending comments:`, error);
    return NextResponse.json({ error: `Failed to ${action.verb} comments` }, { status: 500 });
  }
}

export function POST(request: NextRequest, { params }: { params: SprintParams }) {
  return resolveAllPending(request, params, { run: approveAllPendingSprintComments, verb: 'approve' });
}

export function DELETE(request: NextRequest, { params }: { params: SprintParams }) {
  return resolveAllPending(request, params, { run: rejectAllPendingSprintComments, verb: 'reject' });
}
