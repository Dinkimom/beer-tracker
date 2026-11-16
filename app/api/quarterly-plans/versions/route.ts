import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireQuarterQuery } from '@/lib/quarterlyPlans/quarterlyPlanRouteHelpers';
import { listQuarterlyPlanVersionHistory } from '@/lib/quarterlyPlans/quarterlyPlanVersionHistory';

/** GET /api/quarterly-plans/versions?year=&quarter= — история версий плана, новые первыми, со сводкой изменений (QH3). */
export async function GET(request: NextRequest) {
  try {
    const route = await requireQuarterQuery(request);
    if ('response' in route) return route.response;
    const versions = await listQuarterlyPlanVersionHistory(route.ctx.organizationId, route.input);
    return NextResponse.json({ versions });
  } catch (error) {
    return handleApiError(error, 'fetch quarterly plan versions');
  }
}
