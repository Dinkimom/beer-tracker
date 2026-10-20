import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { TRACKER_UPSTREAM_FORWARD_STATUSES, handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import {
  ISSUE_LINKS_BATCH_MAX_KEYS,
  listTrackerIssueLinkEdges,
} from '@/lib/issues/trackerIssueLinksRouteHelpers';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { rejectUnsupportedIssueTrackerCapability } from '@/lib/issueTrackerProvider/issueTrackerCapabilityRoute';
import { formatValidationError, validateRequest } from '@/lib/validation';

const BatchIssueLinksSchema = z.object({
  issueKeys: z.array(z.string().trim().min(1)).min(1).max(ISSUE_LINKS_BATCH_MAX_KEYS),
});

/** Batch list from Tracker/Jira. One upstream search for cache misses; 30m in-memory cache. */
export async function POST(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId } = tenantResult.ctx;

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const unsupported = rejectUnsupportedIssueTrackerCapability(
      issueTracker.providerKind,
      'supportsIssueLinks',
      'listIssueLinks'
    );
    if (unsupported) {
      return unsupported;
    }

    const body = await request.json();
    const validation = validateRequest(BatchIssueLinksSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const links = await listTrackerIssueLinkEdges({
      issueKeys: validation.data.issueKeys,
      issueTracker,
      organizationId,
    });

    return NextResponse.json(
      { links },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    return handleApiError(error, 'batch list issue links', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
