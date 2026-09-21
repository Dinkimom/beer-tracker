import type { IssueTrackerScreenField } from '@/lib/issueTrackerProvider';

import { NextRequest, NextResponse } from 'next/server';

import { TRACKER_UPSTREAM_FORWARD_STATUSES, handleApiError } from '@/lib/api-error-handler';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { rejectUnsupportedIssueTrackerCapability } from '@/lib/issueTrackerProvider/issueTrackerCapabilityRoute';
import { resolveParams } from '@/lib/nextjs-utils';

export type TransitionFieldEnriched = IssueTrackerScreenField;

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

    const unsupported = rejectUnsupportedIssueTrackerCapability(
      'supportsScreenCatalog',
      'getScreenFields'
    );
    if (unsupported) {
      return unsupported;
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const fields: TransitionFieldEnriched[] = await issueTracker.getScreenFields(screenId);

    return NextResponse.json({ fields });
  } catch (error) {
    return handleApiError(error, 'fetch screen fields', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
