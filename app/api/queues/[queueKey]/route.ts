import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { resolveParams } from '@/lib/nextjs-utils';

/**
 * GET /api/queues/{queueKey}
 * Метаданные одной очереди из Tracker.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ queueKey: string }> | { queueKey: string } }
) {
  try {
    const { queueKey } = await resolveParams(params);
    if (!queueKey?.trim()) {
      return NextResponse.json({ error: 'queueKey is required' }, { status: 400 });
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const queue = await issueTracker.getQueue(queueKey);
    if (!queue) {
      return NextResponse.json({ error: 'Queue not found' }, { status: 404 });
    }

    return NextResponse.json({ key: queue.key, name: queue.name });
  } catch (error) {
    return handleApiError(error, 'fetch queue');
  }
}
