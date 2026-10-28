import { NextRequest, NextResponse } from 'next/server';

import { handleApiError, TRACKER_UPSTREAM_FORWARD_STATUSES } from '@/lib/api-error-handler';
import { resolveIssueRouteParams } from '@/lib/issues/issueRouteParams';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> | { issueKey: string } }
) {
  try {
    const issueRoute = await resolveIssueRouteParams(params);
    if ('response' in issueRoute) {
      return issueRoute.response;
    }
    const { issueKey } = issueRoute;

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const data = await issueTracker.getIssueTransitions(issueKey);

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, 'fetch transitions', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
