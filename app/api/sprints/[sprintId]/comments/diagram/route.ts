import { NextRequest, NextResponse } from 'next/server';

import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { insertSprintDiagramComment } from '@/lib/sprints';
import { parseCreateDiagramCommentBody } from '@/lib/sprints/sprintCommentDiagramRouteHelpers';
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

    const parsed = parseCreateDiagramCommentBody(await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const comment = await insertSprintDiagramComment({
      assigneeId: parsed.value.assigneeId,
      commentId: parsed.value.commentId,
      createdBy: tenantResult.ctx.userId,
      day: parsed.value.day,
      height: parsed.value.height,
      name: parsed.value.name,
      organizationId: tenantResult.ctx.organizationId,
      part: parsed.value.part,
      sprintId,
      width: parsed.value.width,
    });
    if (!comment) {
      return NextResponse.json({ error: 'Failed to save comment' }, { status: 500 });
    }

    notifySprintRealtime(request, tenantResult.ctx.organizationId, sprintId, ['comments']);
    return NextResponse.json({ comment });
  } catch (error) {
    console.error('Error saving diagram comment:', error);
    return NextResponse.json({ error: 'Failed to save comment' }, { status: 500 });
  }
}
