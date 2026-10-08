import { NextRequest, NextResponse } from 'next/server';

import { TRACKER_UPSTREAM_FORWARD_STATUSES, handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import {
  createIssueLinkWriteThrough,
  loadIssueLinksWithCacheRefresh,
} from '@/lib/issues/issueLinksRouteHelpers';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { rejectUnsupportedIssueTrackerCapability } from '@/lib/issueTrackerProvider/issueTrackerCapabilityRoute';
import { resolveParams } from '@/lib/nextjs-utils';
import { CreateIssueLinkSchema, formatValidationError, validateRequest } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> | { issueKey: string } }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId } = tenantResult.ctx;

    const { issueKey } = await resolveParams(params);
    if (!issueKey) {
      return NextResponse.json({ error: 'issueKey is required' }, { status: 400 });
    }

    const unsupported = rejectUnsupportedIssueTrackerCapability(
      'supportsIssueLinks',
      'listIssueLinks'
    );
    if (unsupported) {
      return unsupported;
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const { fromCache, links } = await loadIssueLinksWithCacheRefresh({
      organizationId,
      issueKey,
      issueTracker,
    });

    return NextResponse.json({ links, fromCache });
  } catch (error) {
    return handleApiError(error, 'list issue links', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> | { issueKey: string } }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId } = tenantResult.ctx;

    const { issueKey } = await resolveParams(params);
    if (!issueKey) {
      return NextResponse.json({ error: 'issueKey is required' }, { status: 400 });
    }

    const body = await request.json();
    const validation = validateRequest(CreateIssueLinkSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const unsupported = rejectUnsupportedIssueTrackerCapability(
      'supportsIssueLinks',
      'createIssueLink'
    );
    if (unsupported) {
      return unsupported;
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const link = await createIssueLinkWriteThrough({
      organizationId,
      issueKey,
      issueTracker,
      payload: validation.data,
    });

    return NextResponse.json({ success: true, link }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'create issue link', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
