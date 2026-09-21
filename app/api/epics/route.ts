import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { apiCache, cacheKeys } from '@/lib/cache';
import { queryEpicSnapshotsForOrgQueue } from '@/lib/snapshots';
import { getTeamByBoardId } from '@/lib/staffTeams';

const EPICS_LIST_CACHE_TTL = 5 * 60;

function parsePositiveBoardId(boardIdParam: string | null): NextResponse | number {
  if (!boardIdParam) {
    return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
  }
  const boardId = Number(boardIdParam);
  if (!Number.isFinite(boardId) || boardId <= 0) {
    return NextResponse.json({ error: 'boardId must be a positive number' }, { status: 400 });
  }
  return boardId;
}

function parseEpicsListPagination(searchParams: URLSearchParams) {
  const pageParam = searchParams.get('page');
  const perPageParam = searchParams.get('perPage');
  const minYearParam = searchParams.get('minYear');
  const page = pageParam ? Number(pageParam) : 1;
  const perPage = perPageParam ? Number(perPageParam) : 100;
  const minYearParsed = minYearParam ? Number(minYearParam) : undefined;
  const minYear =
    minYearParsed !== undefined && Number.isFinite(minYearParsed) ? minYearParsed : undefined;
  return { minYear, page, perPage };
}

export async function GET(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;

    const searchParams = request.nextUrl.searchParams;
    const boardIdParam = searchParams.get('boardId');
    const boardIdResult = parsePositiveBoardId(boardIdParam);
    if (boardIdResult instanceof NextResponse) {
      return boardIdResult;
    }
    const boardId = boardIdResult;

    const team = await getTeamByBoardId(organizationId, boardId);
    const queue = team?.tracker_queue_key?.trim();
    if (!queue) {
      return NextResponse.json(
        { error: 'Queue for board not found' },
        { status: 404 }
      );
    }

    const { minYear, page, perPage } = parseEpicsListPagination(searchParams);

    const cacheKey = cacheKeys.epicsListFromPg(
      organizationId,
      boardId,
      page,
      perPage,
      minYear ?? null
    );
    const cached = apiCache.get<{
      epics: Array<{
        createdAt?: string;
        id: string;
        name: string;
        originalStatus?: string;
        type?: string;
      }>;
      pagination: {
        page: number;
        perPage: number;
        totalCount: number;
        totalPages: number;
      };
    }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const { issues, totalCount, totalPages } = await queryEpicSnapshotsForOrgQueue(
      organizationId,
      queue,
      page,
      perPage,
      minYear
    );

    const epics = issues.map((issue) => ({
      id: issue.key,
      name: issue.summary,
      originalStatus: issue.status?.display,
      createdAt: issue.createdAt,
      type: issue.type?.key ?? 'epic',
    }));

    const body = {
      epics,
      pagination: {
        page,
        perPage,
        totalCount,
        totalPages,
      },
    };
    apiCache.set(cacheKey, body, EPICS_LIST_CACHE_TTL);
    return NextResponse.json(body);
  } catch (error) {
    return handleApiError(error, 'fetch epics list');
  }
}
