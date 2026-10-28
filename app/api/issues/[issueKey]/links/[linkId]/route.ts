import { NextRequest, NextResponse } from 'next/server';

import { TRACKER_UPSTREAM_FORWARD_STATUSES, handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { resolveIssueRouteParams } from '@/lib/issues/issueRouteParams';
import { deleteTrackerIssueLink } from '@/lib/issues/trackerIssueLinksRouteHelpers';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { rejectUnsupportedIssueTrackerCapability } from '@/lib/issueTrackerProvider/issueTrackerCapabilityRoute';

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ issueKey: string; linkId: string }> | { issueKey: string; linkId: string };
  }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId } = tenantResult.ctx;

    const issueRoute = await resolveIssueRouteParams(params, ['linkId']);
    if ('response' in issueRoute) {
      return issueRoute.response;
    }
    const { issueKey } = issueRoute;
    const { linkId } = issueRoute.params;

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const unsupported = rejectUnsupportedIssueTrackerCapability(
      issueTracker.providerKind,
      'supportsIssueLinks',
      'deleteIssueLink'
    );
    if (unsupported) {
      return unsupported;
    }

    await deleteTrackerIssueLink({
      issueKey,
      issueTracker,
      organizationId,
      trackerLinkId: linkId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'delete issue link', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
