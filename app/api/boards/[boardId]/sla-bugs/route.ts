import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { getIssueTrackerProviderKind } from '@/lib/env';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { issueTrackerProviderCapabilities } from '@/lib/issueTrackerProvider/issueTrackerUi';
import { enrichTasksWithOverseerHdCounts } from '@/lib/overseer/hdCountRead';
import { classifyAndGroupSlaBugs } from '@/lib/slaBugs/classifySlaBug';
import { filterSlaBugTasks } from '@/lib/slaBugs/filterSlaBugTasks';
import {
  buildSlaBugSidebarStats,
  filterTasksCreatedSince,
  filterTasksResolvedSince,
} from '@/lib/slaBugs/sidebarStats';
import { getTeamByBoardId } from '@/lib/staffTeams';
import {
  buildSlaBugsArrivedSinceQuery,
  buildSlaBugsClosedSinceQuery,
  buildSlaBugsQueryForProductTeam,
} from '@/lib/trackerApi/issues';
import { loadTrackerIntegrationForOrganization } from '@/lib/trackerIntegration';

const SLA_BUGS_MAX_ISSUES = 500;
const SLA_BUGS_WEEKLY_STATS_MAX = 300;
const SLA_BUGS_WEEKLY_LOOKBACK_DAYS = 7;

function startOfUtcDayDaysAgo(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * GET /api/boards/[boardId]/sla-bugs
 * Открытые SLA-баги продуктовой команды доски («Продуктовая команда», Type: bug, P0–P4, не closed).
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

    const team = await getTeamByBoardId(organizationId, boardIdNum);
    const productTeamSlug = team?.slug?.trim();
    if (!productTeamSlug) {
      return NextResponse.json({ error: 'Team for board not found' }, { status: 404 });
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    if (!issueTrackerProviderCapabilities(getIssueTrackerProviderKind()).supportsSlaBugs) {
      const grouped = classifyAndGroupSlaBugs([]);
      return NextResponse.json({
        tasks: [],
        truncated: false,
        totalCount: 0,
        stats: buildSlaBugSidebarStats([], [], [], grouped),
      });
    }
    const since = startOfUtcDayDaysAgo(SLA_BUGS_WEEKLY_LOOKBACK_DAYS);
    const openQuery = buildSlaBugsQueryForProductTeam(productTeamSlug);
    const arrivedQuery = buildSlaBugsArrivedSinceQuery(productTeamSlug, since);
    const closedQuery = buildSlaBugsClosedSinceQuery(productTeamSlug, since);

    const [openResult, arrivedResult, closedResult, integration] = await Promise.all([
      issueTracker.listIssuesByQuery(openQuery, {
        maxTotalIssues: SLA_BUGS_MAX_ISSUES,
      }),
      issueTracker.listIssuesByQuery(arrivedQuery, {
        maxTotalIssues: SLA_BUGS_WEEKLY_STATS_MAX,
      }),
      issueTracker.listIssuesByQuery(closedQuery, {
        maxTotalIssues: SLA_BUGS_WEEKLY_STATS_MAX,
      }),
      loadTrackerIntegrationForOrganization(organizationId),
    ]);

    const mapIssues = (issues: typeof openResult.issues) =>
      issues.map((issue) => issueTracker.mapIssueToTask(issue, integration));

    const mappedOpenTasks = mapIssues(openResult.issues);
    const enrichedOpenTasks = await enrichTasksWithOverseerHdCounts(mappedOpenTasks);
    const { tasks } = filterSlaBugTasks(enrichedOpenTasks);
    const grouped = classifyAndGroupSlaBugs(tasks);
    const arrivedThisWeek = filterTasksCreatedSince(
      filterSlaBugTasks(mapIssues(arrivedResult.issues)).tasks,
      since
    );
    const closedThisWeek = filterTasksResolvedSince(
      filterSlaBugTasks(mapIssues(closedResult.issues)).tasks,
      since
    );
    const stats = buildSlaBugSidebarStats(tasks, arrivedThisWeek, closedThisWeek, grouped);

    return NextResponse.json({
      tasks,
      truncated: openResult.truncated,
      totalCount: tasks.length,
      stats,
    });
  } catch (error) {
    return handleApiError(error, 'fetch SLA bugs');
  }
}
