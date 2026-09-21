import { NextRequest, NextResponse } from 'next/server';

import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { resolveParams } from '@/lib/nextjs-utils';
import { flattenQueueIssueTypes } from '@/lib/planner/queueIssueTypes';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ queueKey: string }> | { queueKey: string } }
) {
  try {
    const { queueKey } = await resolveParams(params);

    if (!queueKey) {
      return NextResponse.json({ error: 'queueKey is required' }, { status: 400 });
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const workflows = await issueTracker.getQueueWorkflows(queueKey);
    const types = flattenQueueIssueTypes(workflows);

    return NextResponse.json({ types });
  } catch (error) {
    console.error('Error fetching queue workflows:', error);
    return NextResponse.json({ error: 'Failed to fetch queue workflows' }, { status: 500 });
  }
}
