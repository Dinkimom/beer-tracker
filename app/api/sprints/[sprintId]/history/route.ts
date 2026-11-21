import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { loadSprintHistory } from '@/lib/boardHistory/sprintHistoryRepository';
import { requireSprintRouteContext } from '@/lib/sprints/sprintRouteContext';

function parseTimeParam(raw: string | null): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** История изменений спринта: `?since=&until=` (ISO) — окно для событий задач из трекера. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  try {
    const tenantResult = await requireSprintRouteContext(request, params);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { searchParams } = new URL(request.url);
    const events = await loadSprintHistory({
      organizationId: tenantResult.ctx.organizationId,
      since: parseTimeParam(searchParams.get('since')),
      sprintId: tenantResult.sprintId,
      until: parseTimeParam(searchParams.get('until')),
    });
    return NextResponse.json({ events });
  } catch (error) {
    return handleApiError(error, 'fetch sprint history');
  }
}
