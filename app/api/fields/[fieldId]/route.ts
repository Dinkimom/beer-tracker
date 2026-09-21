import { NextRequest, NextResponse } from 'next/server';

import { TRACKER_UPSTREAM_FORWARD_STATUSES, handleApiError } from '@/lib/api-error-handler';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { rejectUnsupportedIssueTrackerCapability } from '@/lib/issueTrackerProvider/issueTrackerCapabilityRoute';
import { resolveParams } from '@/lib/nextjs-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fieldId: string }> | { fieldId: string } }
) {
  try {
    const { fieldId } = await resolveParams(params);

    if (!fieldId) {
      return NextResponse.json(
        { error: 'fieldId is required' },
        { status: 400 }
      );
    }

    const unsupported = rejectUnsupportedIssueTrackerCapability('supportsFieldCatalog', 'getField');
    if (unsupported) {
      return unsupported;
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const field = await issueTracker.getField(fieldId);

    if (!field) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }

    return NextResponse.json(field);
  } catch (error) {
    return handleApiError(error, 'fetch field', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
