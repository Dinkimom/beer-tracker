import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { getQueryParam } from '@/lib/api-utils';
import { apiCache, cacheKeys } from '@/lib/cache';
import { mapIssueToStoryResponse } from '@/lib/mappers';
import {
  type PagedTrackerIssues,
  queryEpicSnapshotsForOrgQueue,
  queryStorySnapshotsForOrgQueue,
} from '@/lib/snapshots';
import { getTeamByBoardId } from '@/lib/staffTeams';

const STORIES_CACHE_TTL = 5 * 60;

/**
 * GET /api/stories
 * Стори и эпики для доски из issue_snapshots (очередь из teams по boardId).
 */
export async function GET(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;

    const boardIdParam = getQueryParam(request, 'boardId');

    if (!boardIdParam) {
      return NextResponse.json(
        { error: 'boardId query parameter is required' },
        { status: 400 }
      );
    }

    const boardId = parseInt(boardIdParam, 10);
    if (isNaN(boardId)) {
      return NextResponse.json(
        { error: 'Invalid boardId format' },
        { status: 400 }
      );
    }

    const team = await getTeamByBoardId(organizationId, boardId);
    const queue = team?.tracker_queue_key?.trim();
    if (!queue) {
      return NextResponse.json(
        { error: `Queue not found for board ${boardId}` },
        { status: 400 }
      );
    }

    const page = parseInt(getQueryParam(request, 'page') || '1', 10);
    const perPage = Math.min(parseInt(getQueryParam(request, 'perPage') || '50', 10), 50);
    const epicKey = getQueryParam(request, 'epicKey');

    const cacheKey = epicKey
      ? cacheKeys.storiesListFromPg(
          organizationId,
          boardId,
          page,
          perPage,
          epicKey
        )
      : cacheKeys.storiesListFromPg(
          organizationId,
          boardId,
          page,
          perPage,
          null
        );
    const cachedData = apiCache.get<{ pagination: unknown; stories: unknown[] }>(cacheKey);

    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    let epicsResponse: PagedTrackerIssues;
    let storiesResponse: PagedTrackerIssues;

    if (epicKey) {
      storiesResponse = await queryStorySnapshotsForOrgQueue(
        organizationId,
        queue,
        page,
        perPage,
        { epicKey }
      );
      epicsResponse = { issues: [], totalCount: 0, totalPages: 0 };
    } else {
      [epicsResponse, storiesResponse] = await Promise.all([
        queryEpicSnapshotsForOrgQueue(organizationId, queue, page, perPage),
        queryStorySnapshotsForOrgQueue(organizationId, queue, page, perPage),
      ]);
    }

    const allIssues = [...epicsResponse.issues, ...storiesResponse.issues];

    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const issues = allIssues.slice(startIndex, endIndex);
    const totalCount = allIssues.length;
    const totalPages = Math.ceil(totalCount / perPage);

    const stories = issues.map(mapIssueToStoryResponse);

    const responseData = {
      stories,
      pagination: {
        page,
        perPage,
        totalCount,
        totalPages,
      },
    };

    apiCache.set(cacheKey, responseData, STORIES_CACHE_TTL);

    return NextResponse.json(responseData);
  } catch (error) {
    return handleApiError(error, 'fetch stories');
  }
}
