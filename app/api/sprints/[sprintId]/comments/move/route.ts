import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { notifySprintRealtimeForSprintIds } from '@/lib/realtime/notifySprintRealtime';
import { moveSprintCommentsToSprint } from '@/lib/sprints';
import { parseMoveSprintCommentsBody } from '@/lib/sprints/sprintCommentsMoveRouteHelpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { sprintId: sprintIdStr } = await resolveParams(params);
    const fromSprintId = Number.parseInt(sprintIdStr, 10);
    if (!Number.isInteger(fromSprintId) || fromSprintId <= 0) {
      return NextResponse.json({ error: 'Invalid sprint ID' }, { status: 400 });
    }
    const parsed = parseMoveSprintCommentsBody(await request.json(), fromSprintId);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const moved = await moveSprintCommentsToSprint({
      commentIds: parsed.value.commentIds,
      fromSprintId,
      organizationId: tenantResult.ctx.organizationId,
      toSprintId: parsed.value.targetSprintId,
    });
    if (moved === 0) {
      return NextResponse.json({ error: 'Comments not found', moved }, { status: 404 });
    }
    notifySprintRealtimeForSprintIds(
      request,
      [fromSprintId, parsed.value.targetSprintId],
      ['comments', 'links']
    );
    return NextResponse.json({ moved, success: true });
  } catch (error) {
    console.error('Error moving sprint comments:', error);
    return NextResponse.json({ error: 'Failed to move comments' }, { status: 500 });
  }
}
