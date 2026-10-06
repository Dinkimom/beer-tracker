import { NextRequest, NextResponse } from 'next/server';

import {
  TRACKER_UPSTREAM_FORWARD_STATUSES,
  handleApiError,
} from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { ASSIGNEE_VELOCITY_SPRINT_WINDOW } from '@/lib/sprints/assigneeVelocity';
import { loadAssigneeVelocity } from '@/lib/sprints/loadAssigneeVelocity';
import { parseSprintIdsCsv } from '@/lib/sprints/sprintBatchHelpers';
import { sprintTaskCompletionRulesFromIntegration } from '@/lib/sprints/sprintTaskCompletion';
import { loadTrackerIntegrationForOrganization } from '@/lib/trackerIntegration';

function parseAssigneeVelocitySprintIds(raw: string | null): NextResponse | number[] {
  const sprintIds = [...new Set(parseSprintIdsCsv(raw))].filter((id) => id > 0);
  if (sprintIds.length === 0 || sprintIds.length > ASSIGNEE_VELOCITY_SPRINT_WINDOW) {
    return NextResponse.json(
      { error: 'sprintIds must contain 1 to 3 positive ids' },
      { status: 400 }
    );
  }
  return sprintIds;
}

export async function GET(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }

    const sprintIds = parseAssigneeVelocitySprintIds(
      new URL(request.url).searchParams.get('sprintIds')
    );
    if (sprintIds instanceof NextResponse) {
      return sprintIds;
    }

    const organizationId = tenantResult.ctx.organizationId;
    const [issueTracker, integration] = await Promise.all([
      getIssueTrackerProviderClientFromRequest(request),
      loadTrackerIntegrationForOrganization(organizationId),
    ]);
    const completionRules = sprintTaskCompletionRulesFromIntegration({
      readyStatusKey: integration?.releaseReadiness?.readyStatusKey,
      statuses: integration?.statuses,
    });
    const body = await loadAssigneeVelocity({
      completionRules,
      integration,
      issueTracker,
      organizationId,
      sprintIds,
    });
    return NextResponse.json(body);
  } catch (error) {
    return handleApiError(error, 'fetch assignee velocity', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
