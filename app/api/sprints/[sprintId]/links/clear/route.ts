import { NextRequest, NextResponse } from 'next/server';

import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { clearTaskLinksForSprint } from '@/lib/sprints';
import { requireSprintRouteContext } from '@/lib/sprints/sprintRouteContext';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  try {
    const tenantResult = await requireSprintRouteContext(request, params);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;
    const { sprintId } = tenantResult;

    await clearTaskLinksForSprint({ organizationId, sprintId });

    notifySprintRealtime(request, organizationId, sprintId, ['links']);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing links:', error);
    return NextResponse.json(
      { error: 'Failed to clear links' },
      { status: 500 }
    );
  }
}
