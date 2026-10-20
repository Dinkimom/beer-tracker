import { NextRequest, NextResponse } from 'next/server';

import { TRACKER_UPSTREAM_FORWARD_STATUSES, handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { DEFAULT_METRICS_QUARTERS, MAX_METRICS_QUARTERS } from '@/lib/sprintMetrics/aggregateSprintMetrics';
import { loadBoardSprintMetrics } from '@/lib/sprintMetrics/sprintMetricsService';

function parseQuarters(raw: string | null): number {
  const value = raw ? parseInt(raw, 10) : DEFAULT_METRICS_QUARTERS;
  if (Number.isNaN(value)) return DEFAULT_METRICS_QUARTERS;
  return Math.min(Math.max(value, 1), MAX_METRICS_QUARTERS);
}

/**
 * GET /api/boards/[boardId]/sprint-metrics?quarters=4
 * Факты метрик по спринтам доски за последние кварталы (1–8, по умолчанию 4). Недостающие спринты досчитываются порциями:
 * `pending > 0` — повторить запрос.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId } = tenantResult.ctx;

    const { boardId } = await params;
    const boardIdNum = parseInt(boardId, 10);
    if (Number.isNaN(boardIdNum) || boardIdNum <= 0) {
      return NextResponse.json({ error: 'boardId must be a positive number' }, { status: 400 });
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const data = await loadBoardSprintMetrics({
      boardId: boardIdNum,
      issueTracker,
      nowMs: Date.now(),
      organizationId,
      quarters: parseQuarters(request.nextUrl.searchParams.get('quarters')),
    });
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, 'load sprint metrics', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
