import { NextRequest, NextResponse } from 'next/server';

import { buildTransitionsBatchApiResponse } from '@/lib/issues/issueTrackerRouteJson';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';

/**
 * POST /api/issues/transitions/batch
 * Body: { issueKeys: string[] }
 * Returns: { [issueKey]: TransitionItem[] }
 *
 * Один запрос вместо N — загружает transitions для всех задач спринта.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const keys = Array.isArray(body?.issueKeys)
      ? body.issueKeys.filter((k: unknown) => typeof k === 'string')
      : [];
    if (keys.length === 0) {
      return NextResponse.json(buildTransitionsBatchApiResponse(keys, {}));
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const data = await issueTracker.listIssueTransitionsBatch(keys);
    return NextResponse.json(buildTransitionsBatchApiResponse(keys, data));
  } catch (error) {
    console.error('Error fetching transitions batch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transitions batch' },
      { status: 500 }
    );
  }
}
