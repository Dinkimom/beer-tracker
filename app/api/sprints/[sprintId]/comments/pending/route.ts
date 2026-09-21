import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import {
  approveAllPendingSprintComments,
  rejectAllPendingSprintComments,
} from '@/lib/sprints/sprintCommentApprove';

async function parseSprintId(
  params: Promise<{ sprintId: string }> | { sprintId: string }
): Promise<number> {
  const { sprintId: sprintIdStr } = await resolveParams(params);
  return parseInt(sprintIdStr, 10);
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
    const sprintId = await parseSprintId(params);
    if (Number.isNaN(sprintId)) {
      return NextResponse.json({ error: 'Invalid sprint ID' }, { status: 400 });
    }
    const count = await approveAllPendingSprintComments({ sprintId });
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
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const sprintId = await parseSprintId(params);
    if (Number.isNaN(sprintId)) {
      return NextResponse.json({ error: 'Invalid sprint ID' }, { status: 400 });
    }
    const count = await rejectAllPendingSprintComments({ sprintId });
    notifySprintRealtime(request, tenantResult.ctx.organizationId, sprintId, ['comments']);
    return NextResponse.json({ count, ok: true });
  } catch (error) {
    console.error('Error rejecting pending comments:', error);
    return NextResponse.json({ error: 'Failed to reject comments' }, { status: 500 });
  }
}
