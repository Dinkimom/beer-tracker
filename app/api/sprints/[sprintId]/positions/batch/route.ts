import { NextRequest, NextResponse } from 'next/server';

import { TRACKER_UPSTREAM_FORWARD_STATUSES, handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import {
  persistBatchPositionsTransaction,
  syncBatchAssigneesToTracker,
  syncBatchPlannedDatesToTracker,
} from '@/lib/sprints';
import { BatchPositionsSchema, formatValidationError, validateRequest } from '@/lib/validation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;
    const { sprintId: sprintIdStr } = await resolveParams(params);
    const sprintId = parseInt(sprintIdStr, 10);

    if (isNaN(sprintId)) {
      return NextResponse.json(
        { error: 'Invalid sprint ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const validation = validateRequest(BatchPositionsSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const { positions } = validation.data;

    await persistBatchPositionsTransaction({
      organizationId,
      positions,
      sprintId,
    });

    await syncBatchAssigneesToTracker({
      organizationId,
      positions,
      request,
    });

    await syncBatchPlannedDatesToTracker({
      organizationId,
      positions,
      request,
      sprintId,
    });

    notifySprintRealtime(request, organizationId, sprintId, ['positions']);
    return NextResponse.json({
      success: true,
      count: positions.length,
    });
  } catch (error) {
    return handleApiError(error, 'save batch positions', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
