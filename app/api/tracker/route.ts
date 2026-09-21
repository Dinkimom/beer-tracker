import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { getQueryParam } from '@/lib/api-utils';
import { jsonGzipResponse } from '@/lib/http/jsonGzipResponse';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { loadSprintIssuesForPlanner } from '@/lib/tracker/loadSprintIssuesForPlanner';
import { resolveTrackerRouteSprintInfo } from '@/lib/tracker/resolveTrackerRouteSprintInfo';
import { slimSprintPlannerListTask } from '@/lib/tracker/slimSprintPlannerListTask';
import {
  applyOccupancyOrderToTasks,
  enrichDevelopersWithAvatars,
  fetchDevelopersForBoard,
  filterTrackerTasksByStatus,
  parseValidatedSprintId,
} from '@/lib/tracker/trackerRouteHelpers';
import { mapTrackerIssueToTask } from '@/lib/trackerApi';
import { loadTrackerIntegrationForOrganization } from '@/lib/trackerIntegration';
import { SprintIdQuerySchema, formatValidationError, validateRequest } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId } = tenantResult.ctx;

    const sprintId = getQueryParam(request, 'sprintId');
    const boardId = getQueryParam(request, 'boardId');
    const statusFilter = getQueryParam(request, 'statusFilter');
    const refreshParam = getQueryParam(request, 'refresh');
    const forceRefresh = refreshParam === '1' || refreshParam === 'true';

    const validation = validateRequest(SprintIdQuerySchema, { sprintId });
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const sprintIdParsed = parseValidatedSprintId(validation.data.sprintId);
    if (sprintIdParsed instanceof NextResponse) {
      return sprintIdParsed;
    }
    const sprintIdNum = sprintIdParsed;

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const sprintInfo = resolveTrackerRouteSprintInfo(boardId, sprintIdNum);

    const [issues, integration, developersRaw] = await Promise.all([
      loadSprintIssuesForPlanner({
        boardId,
        forceRefresh,
        issueTracker,
        organizationId,
        sprintId: sprintIdNum,
        sprintStatus: sprintInfo?.status,
      }),
      loadTrackerIntegrationForOrganization(organizationId),
      fetchDevelopersForBoard(organizationId, boardId),
    ]);

    let tasks = issues.map((issue) =>
      mapTrackerIssueToTask(issue, integration, { omitDescription: true })
    );
    const [orderedTasks, developers] = await Promise.all([
      applyOccupancyOrderToTasks(organizationId, sprintIdNum, tasks),
      enrichDevelopersWithAvatars(organizationId, developersRaw),
    ]);
    tasks = filterTrackerTasksByStatus(orderedTasks, statusFilter).map(slimSprintPlannerListTask);

    return jsonGzipResponse(
      {
        developers,
        sprintInfo,
        tasks,
      },
      request.headers.get('accept-encoding')
    );
  } catch (error) {
    return handleApiError(error, 'fetch data from Tracker');
  }
}
