import { NextRequest, NextResponse } from 'next/server';

import {
  TRACKER_UPSTREAM_FORWARD_STATUSES,
  handleApiError,
} from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { resolveParams } from '@/lib/nextjs-utils';
import { queryIssueSnapshotsMatchingSprint } from '@/lib/snapshots';
import { aggregateSprintGoalsByTeam } from '@/lib/sprintGoals';
import { sprintTaskCompletionRulesFromIntegration } from '@/lib/sprints/sprintTaskCompletion';
import { buildSprintScoreApiResponse } from '@/lib/sprints/sprintTrackerRouteJson';
import { resolveTrackerTestingFlowMode } from '@/lib/sprints/testingFlowMode';
import { mapTrackerIssueToTask } from '@/lib/trackerApi/issues';
import { isTrackerSprintIssuesFrozen } from '@/lib/trackerApi/sprintIssuesCache';
import { loadTrackerIntegrationForOrganization } from '@/lib/trackerIntegration';

async function queryIssueSnapshotsMatchingSprintSafe(
  organizationId: string,
  args: { sprintId: string; sprintName: string }
) {
  try {
    return await queryIssueSnapshotsMatchingSprint(organizationId, args);
  } catch {
    return [];
  }
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
      return NextResponse.json({ error: 'sprintId is required' }, { status: 400 });
    }

    const sprintIdNum = parseInt(sprintId, 10);
    if (isNaN(sprintIdNum)) {
      return NextResponse.json({ error: 'sprintId must be a valid number' }, { status: 400 });
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const [sprintInfo, integration] = await Promise.all([
      issueTracker.getSprint(sprintIdNum),
      loadTrackerIntegrationForOrganization(organizationId),
    ]);
    const skipTrackerSearch = isTrackerSprintIssuesFrozen(sprintInfo.status);
    const testingFlowMode = resolveTrackerTestingFlowMode(integration);

    const [trackerIssues, pgGoals] = await Promise.all([
      issueTracker.listSprintIssues(sprintIdNum, {
        sprintStatus: sprintInfo.status,
        cacheOnly: skipTrackerSearch,
      }),
      aggregateSprintGoalsByTeam({ organizationId, sprintId: sprintIdNum }),
    ]);

    const snapshotTasks =
      trackerIssues.length > 0
        ? trackerIssues.map((issue) => issueTracker.mapIssueToTask(issue, integration))
        : (
            await queryIssueSnapshotsMatchingSprintSafe(organizationId, {
              sprintId: String(sprintIdNum),
              sprintName: sprintInfo.name ?? '',
            })
          ).map((issue) => mapTrackerIssueToTask(issue, integration));
    const completionRules = sprintTaskCompletionRulesFromIntegration({
      readyStatusKey: integration?.releaseReadiness?.readyStatusKey,
      statuses: integration?.statuses,
    });
    return NextResponse.json(
      buildSprintScoreApiResponse({
        completionRules,
        goalsByTeam: pgGoals,
        snapshotTasks,
        sprintId: sprintIdNum,
        sprintName: sprintInfo.name ?? '',
        testingFlowMode,
      })
    );
  } catch (error) {
    return handleApiError(error, 'fetch sprint score', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
