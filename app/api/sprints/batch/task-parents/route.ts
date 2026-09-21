import { NextRequest, NextResponse } from 'next/server';

import { TRACKER_UPSTREAM_FORWARD_STATUSES, handleApiError } from '@/lib/api-error-handler';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { parseSprintIdsCsv } from '@/lib/sprints/sprintRouteParseHelpers';
import { collectBatchTaskParentKeys } from '@/lib/sprints/taskParentsBatchRouteHelpers';

/**
 * GET /api/sprints/batch/task-parents?sprintIds=1,2,3
 * Возвращает маппинг taskId → parentKey (story key) для всех задач в указанных спринтах.
 * Используется для отображения «запланировано в спринт» без N запросов по стори/эпикам.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sprintIdsStr = searchParams.get('sprintIds');
    if (!sprintIdsStr) {
      return NextResponse.json(
        { error: 'sprintIds is required (comma-separated)' },
        { status: 400 }
      );
    }
    const sprintIds = parseSprintIdsCsv(sprintIdsStr);
    if (sprintIds.length === 0) {
      return NextResponse.json({ taskIdToStoryKey: {} });
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const taskIdToStoryKey = await collectBatchTaskParentKeys(issueTracker, sprintIds);

    return NextResponse.json({ taskIdToStoryKey });
  } catch (error) {
    return handleApiError(error, 'fetch batch task parents', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
