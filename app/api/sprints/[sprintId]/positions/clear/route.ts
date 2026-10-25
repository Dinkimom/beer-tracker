import { NextRequest, NextResponse } from 'next/server';

import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { clearTaskPositionsForSprint } from '@/lib/sprints';
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

    await clearTaskPositionsForSprint({ organizationId, sprintId });

    notifySprintRealtime(request, organizationId, sprintId, ['positions']);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing positions:', error);
    return NextResponse.json(
      { error: 'Failed to clear positions' },
      { status: 500 }
    );
  }
}
