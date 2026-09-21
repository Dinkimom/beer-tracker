import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { resolveParams } from '@/lib/nextjs-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ queueKey: string }> | { queueKey: string } }
) {
  try {
    const { queueKey } = await resolveParams(params);

    if (!queueKey) {
      return NextResponse.json(
        { error: 'queueKey is required' },
        { status: 400 }
      );
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const screens = await issueTracker.getQueueWorkflowScreens(queueKey);

    return NextResponse.json(screens);
  } catch (error) {
    return handleApiError(error, 'fetch workflow screens');
  }
}
