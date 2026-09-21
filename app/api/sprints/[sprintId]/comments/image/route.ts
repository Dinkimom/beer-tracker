import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { insertSprintImageComment } from '@/lib/sprints';
import { parseSprintImageCommentFormData } from '@/lib/sprints/sprintCommentImageRouteHelpers';

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
    const sprintId = parseInt(sprintIdStr, 10);
    if (Number.isNaN(sprintId)) {
      return NextResponse.json({ error: 'Invalid sprint ID' }, { status: 400 });
    }

    const parsed = await parseSprintImageCommentFormData(await request.formData());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const comment = await insertSprintImageComment({
      assigneeId: parsed.value.assigneeId,
      caption: parsed.value.caption,
      commentId: parsed.value.commentId,
      contentType: parsed.value.contentType,
      createdBy: tenantResult.ctx.userId,
      data: parsed.value.data,
      day: parsed.value.day,
      height: parsed.value.height,
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
    console.error('Error saving image comment:', error);
    return NextResponse.json({ error: 'Failed to save comment' }, { status: 500 });
  }
}
