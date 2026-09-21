import { NextRequest, NextResponse } from 'next/server';

import { handleApiError, TRACKER_UPSTREAM_FORWARD_STATUSES } from '@/lib/api-error-handler';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { rejectUnsupportedIssueTrackerCapability } from '@/lib/issueTrackerProvider/issueTrackerCapabilityRoute';
import { resolveParams } from '@/lib/nextjs-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ screenId: string }> | { screenId: string } }
) {
  try {
    const { screenId } = await resolveParams(params);

    if (!screenId) {
      return NextResponse.json(
        { error: 'screenId is required' },
        { status: 400 }
      );
    }

    const unsupported = rejectUnsupportedIssueTrackerCapability('supportsScreenCatalog', 'getScreen');
    if (unsupported) {
      return unsupported;
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const screen = await issueTracker.getScreen(screenId);

    return NextResponse.json(screen);
  } catch (error) {
    return handleApiError(error, 'fetch screen', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
