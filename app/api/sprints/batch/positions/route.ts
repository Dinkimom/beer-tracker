
import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import {
  buildBatchPositionsResponse,
  fetchBatchPositionsWithSegments,
  parseRequiredSprintIdsParam,
} from '@/lib/sprints';

export async function GET(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;

    const { searchParams } = new URL(request.url);
    const sprintIdsParsed = parseRequiredSprintIdsParam(searchParams.get('sprintIds'));
    if (sprintIdsParsed instanceof NextResponse) {
      return sprintIdsParsed;
    }
    const sprintIds = sprintIdsParsed;
    if (sprintIds.length === 0) {
      return NextResponse.json({ bySprint: [] });
    }

    const bySprint = await fetchBatchPositionsWithSegments({ organizationId, sprintIds });
    return NextResponse.json(buildBatchPositionsResponse(sprintIds, bySprint));
  } catch (error) {
    console.error('Error fetching batch positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 }
    );
  }
}
