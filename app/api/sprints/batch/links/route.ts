import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import {
  buildBatchLinksResponse,
  fetchTaskLinksForSprintIds,
  groupRowsBySprintId,
  parseRequiredSprintIdsParam,
} from '@/lib/sprints';

export async function GET(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;
    const sprintIds = parseRequiredSprintIdsParam(new URL(request.url).searchParams.get('sprintIds'));
    if (sprintIds instanceof NextResponse) {
      return sprintIds;
    }
    if (sprintIds.length === 0) {
      return NextResponse.json({ bySprint: [] });
    }

    const rows = await fetchTaskLinksForSprintIds({ organizationId, sprintIds });
    const bySprint = groupRowsBySprintId(sprintIds, rows);

    return NextResponse.json(buildBatchLinksResponse(sprintIds, bySprint));
  } catch (error) {
    console.error('Error fetching batch links:', error);
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
  }
}
