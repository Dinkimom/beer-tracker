import { NextRequest, NextResponse } from 'next/server';

import { runAsBoardActor, uiBoardActor } from '@/lib/boardHistory/boardEventActor';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { persistBatchTaskLinks } from '@/lib/sprints';
import { requireSprintRouteContext } from '@/lib/sprints/sprintRouteContext';
import { BatchLinksSchema, formatValidationError, validateRequest } from '@/lib/validation';

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

    const body = await request.json();
    const validation = validateRequest(BatchLinksSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const count = await runAsBoardActor(uiBoardActor(tenantResult.ctx.userId), (tx) =>
      persistBatchTaskLinks(
        { links: validation.data.links, organizationId: tenantResult.ctx.organizationId, sprintId },
        tx
      )
    );

    notifySprintRealtime(request, tenantResult.ctx.organizationId, sprintId, ['links']);
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Error saving batch links:', error);
    return NextResponse.json({ error: 'Failed to save batch links' }, { status: 500 });
  }
}
