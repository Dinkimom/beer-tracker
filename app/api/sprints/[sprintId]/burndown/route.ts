import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';
import type { BurndownApiResponse } from '@/lib/sprints/sprintTrackerRouteJson';
import type { TrackerIssue } from '@/types/tracker';
import type { SprintInfo } from '@/types/tracker';

import { NextRequest, NextResponse } from 'next/server';

import {
  TRACKER_UPSTREAM_FORWARD_STATUSES,
  handleApiError,
} from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { mergeTrackerIssuesByKey } from '@/lib/burndown/mergeTrackerIssuesByKey';
import { apiCache, cacheKeys } from '@/lib/cache';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import {
  normalizeYandexIssue,
  yandexIssueFromProviderIssue,
} from '@/lib/issueTrackerProvider/yandexTrackerProvider';
import { resolveParams } from '@/lib/nextjs-utils';
import { queryIssueSnapshotsMatchingSprint } from '@/lib/snapshots';
import {
  buildBurndownApiResponse,
  buildComputedBurndownApiResponse,
  buildEmptyBurndownDataPoints,
  EMPTY_SPRINT_TIMELINE_TOTALS,
} from '@/lib/sprints/sprintTrackerRouteJson';
import { resolveTrackerTestingFlowMode } from '@/lib/sprints/testingFlowMode';
import { getTeamByBoardId } from '@/lib/staffTeams';
import { loadTrackerIntegrationForOrganization } from '@/lib/trackerIntegration';

function isRealTask(issue: TrackerIssue): boolean {
  const team = (issue.functionalTeam ?? '').toLowerCase();
  return !team.includes('qa') && !team.includes('tester');
}

const BURNDOWN_CACHE_TTL_ACTIVE = 10 * 60;
const BURNDOWN_CACHE_TTL_ARCHIVED = 60 * 60;

interface SprintIssuesBundle {
  issues: TrackerIssue[];
  sprintInfo: SprintInfo;
}

/**
 * Спринт — из Tracker. Задачи — объединение Tracker + issue_snapshots по ключу
 * (снимки с совпадением спринта в payload; при boardId — фильтр по functionalTeam = title команды в PG).
 */
async function loadSprintInfoAndIssues(
  issueTracker: IssueTrackerProviderClient,
  organizationId: string,
  sprintIdNum: number,
  boardId: number | undefined
): Promise<SprintIssuesBundle> {
  const sprintInfo = await issueTracker.getSprint(sprintIdNum);

  let functionalTeamExact: string | null = null;
  if (boardId != null) {
    const teamRow = await getTeamByBoardId(organizationId, boardId);
    functionalTeamExact = teamRow?.title?.trim() || null;
  }

  const [fromTrackerProvider, fromSnapshots] = await Promise.all([
    issueTracker.listSprintIssues(sprintIdNum),
    queryIssueSnapshotsMatchingSprint(organizationId, {
      functionalTeamExact,
      sprintId: sprintInfo.id != null ? String(sprintInfo.id) : null,
      sprintName: sprintInfo.name,
    }),
  ]);
  const fromTracker = fromTrackerProvider.map(yandexIssueFromProviderIssue);
  const issues = mergeTrackerIssuesByKey(fromTracker, fromSnapshots);
  return { issues, sprintInfo };
}

async function computeBurndownPayload(
  request: NextRequest,
  organizationId: string,
  sprintIdNum: number,
  boardId: number | undefined
): Promise<
  { cacheTTL: number; response: BurndownApiResponse } | { response: BurndownApiResponse; skipCache: true }
> {
  const integration = await loadTrackerIntegrationForOrganization(organizationId);
  const testingFlowMode = resolveTrackerTestingFlowMode(integration);

  const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
  const { sprintInfo, issues } = await loadSprintInfoAndIssues(
    issueTracker,
    organizationId,
    sprintIdNum,
    boardId
  );

  const isArchived =
    sprintInfo.status === 'archived' || sprintInfo.status === 'released';
  const cacheTTL = isArchived ? BURNDOWN_CACHE_TTL_ARCHIVED : BURNDOWN_CACHE_TTL_ACTIVE;

  const sprintIssueKeys = issues.filter(isRealTask).map((i) => i.key);
  if (sprintIssueKeys.length === 0) {
    return {
      response: buildBurndownApiResponse({
        currentSP: 0,
        currentTP: 0,
        dailyChangelog: {},
        dataPoints: buildEmptyBurndownDataPoints(
          sprintInfo.startDateTime,
          sprintInfo.endDateTime
        ),
        initialSP: 0,
        initialTP: 0,
        sprintInfo: {
          endDate: sprintInfo.endDate,
          name: sprintInfo.name,
          startDate: sprintInfo.startDate,
        },
        sprintTimelineTotals: EMPTY_SPRINT_TIMELINE_TOTALS,
        testingFlowMode,
      }),
      skipCache: true,
    };
  }

  const sprintName = sprintInfo.name ?? '';
  const sprintIdForMatch = sprintInfo.id != null ? String(sprintInfo.id) : undefined;

  const issueByKey = new Map(
    issues.map((issue) => [issue.key, normalizeYandexIssue(issue)])
  );
  const ytrackerIssues = await issueTracker.getBurndownIssuesForKeys(
    sprintIssueKeys,
    {
      sprintId: sprintIdForMatch,
      sprintName,
    },
    issueByKey
  );

  const sprintStartTime = new Date(sprintInfo.startDateTime).getTime();
  const sprintEndTime = new Date(sprintInfo.endDateTime).getTime();

  const issueSummaries = new Map<string, string>();
  for (const issue of issues) {
    issueSummaries.set(issue.key, issue.summary ?? issue.key);
  }

  const startDate = new Date(sprintInfo.startDateTime);
  const endDate = new Date(sprintInfo.endDateTime);

  return {
    cacheTTL,
    response: buildComputedBurndownApiResponse({
      issueSummaries,
      sprintEndDate: endDate,
      sprintEndTime,
      sprintIdForMatch,
      sprintInfo: {
        endDate: sprintInfo.endDate,
        name: sprintInfo.name,
        startDate: sprintInfo.startDate,
      },
      sprintName,
      sprintStartDate: startDate,
      sprintStartTime,
      testingFlowMode,
      ytrackerIssues,
    }),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;

    const { sprintId } = await resolveParams(params);

    if (!sprintId) {
      return NextResponse.json(
        { error: 'sprintId is required' },
        { status: 400 }
      );
    }

    const sprintIdNum = parseInt(sprintId, 10);

    if (isNaN(sprintIdNum)) {
      return NextResponse.json(
        { error: 'sprintId must be a valid number' },
        { status: 400 }
      );
    }

    const boardIdParam = request.nextUrl.searchParams.get('boardId');
    const boardId = boardIdParam ? parseInt(boardIdParam, 10) : undefined;

    const cacheKey = cacheKeys.burndownFromPg(organizationId, sprintIdNum, boardId);
    const cachedData = apiCache.get<BurndownApiResponse>(cacheKey);

    if (
      cachedData &&
      'dailyChangelog' in cachedData &&
      typeof cachedData.dailyChangelog === 'object' &&
      cachedData.sprintTimelineTotals != null
    ) {
      return NextResponse.json(cachedData);
    }

    const computed = await computeBurndownPayload(
      request,
      organizationId,
      sprintIdNum,
      boardId
    );
    if ('cacheTTL' in computed) {
      apiCache.set(cacheKey, computed.response, computed.cacheTTL);
    }
    return NextResponse.json(computed.response);
  } catch (error) {
    return handleApiError(error, 'calculate burndown data', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
