import { NextRequest, NextResponse } from 'next/server';

import { TRACKER_UPSTREAM_FORWARD_STATUSES, handleApiError } from '@/lib/api-error-handler';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { clearSprintBoardPositions, withTrackerSyncFailures } from '@/lib/sprints';
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

    const trackerSyncFailures = await clearSprintBoardPositions({ organizationId, request, sprintId });

    notifySprintRealtime(request, organizationId, sprintId, ['positions']);
    return NextResponse.json(withTrackerSyncFailures({ success: true }, trackerSyncFailures));
  } catch (error) {
    return handleApiError(error, 'clear positions', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
