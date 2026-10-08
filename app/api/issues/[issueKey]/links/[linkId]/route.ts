import { NextRequest, NextResponse } from 'next/server';

import { TRACKER_UPSTREAM_FORWARD_STATUSES, handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { deleteTrackerIssueLink } from '@/lib/issues/trackerIssueLinksRouteHelpers';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { rejectUnsupportedIssueTrackerCapability } from '@/lib/issueTrackerProvider/issueTrackerCapabilityRoute';
import { resolveParams } from '@/lib/nextjs-utils';

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

    const { issueKey, linkId } = await resolveParams(params);
    if (!issueKey || !linkId) {
      return NextResponse.json(
        { error: 'issueKey and linkId are required' },
        { status: 400 }
      );
    }

    const unsupported = rejectUnsupportedIssueTrackerCapability(
      'supportsIssueLinks',
      'deleteIssueLink'
    );
    if (unsupported) {
      return unsupported;
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
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
