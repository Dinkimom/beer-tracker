import type { BurndownApiResponse } from '@/lib/sprints/sprintTrackerRouteJson';

import { NextRequest, NextResponse } from 'next/server';

import {
  TRACKER_UPSTREAM_FORWARD_STATUSES,
  handleApiError,
} from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { loadSprintBurndownSource } from '@/lib/burndown/loadSprintBurndownSource';
import { apiCache, cacheKeys } from '@/lib/cache';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { resolveParams } from '@/lib/nextjs-utils';
import { sprintTaskCompletionRulesFromIntegration } from '@/lib/sprints/sprintTaskCompletion';
import {
  buildBurndownApiResponse,
  buildComputedBurndownApiResponse,
  buildEmptyBurndownDataPoints,
  EMPTY_SPRINT_TIMELINE_TOTALS,
} from '@/lib/sprints/sprintTrackerRouteJson';
import { resolveTrackerTestingFlowMode } from '@/lib/sprints/testingFlowMode';
import { loadTrackerIntegrationForOrganization } from '@/lib/trackerIntegration';

const BURNDOWN_CACHE_TTL_ACTIVE = 10 * 60;
const BURNDOWN_CACHE_TTL_ARCHIVED = 60 * 60;

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
  const { sprintInfo, issues, realIssues, burndownIssues } = await loadSprintBurndownSource({
    boardId,
    integration,
    issueTracker,
    organizationId,
    sprintId: sprintIdNum,
  });

  const isArchived =
    sprintInfo.status === 'archived' || sprintInfo.status === 'released';
  const cacheTTL = isArchived ? BURNDOWN_CACHE_TTL_ARCHIVED : BURNDOWN_CACHE_TTL_ACTIVE;

  if (realIssues.length === 0) {
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
      completionRules: sprintTaskCompletionRulesFromIntegration({
        readyStatusKey: integration?.releaseReadiness?.readyStatusKey,
        statuses: integration?.statuses,
      }),
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
      ytrackerIssues: burndownIssues,
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
