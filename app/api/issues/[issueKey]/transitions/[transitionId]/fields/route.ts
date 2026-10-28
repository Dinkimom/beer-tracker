import { NextRequest, NextResponse } from 'next/server';

import { resolveIssueRouteParams } from '@/lib/issues/issueRouteParams';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params:
      | Promise<{ issueKey: string; transitionId: string }>
      | { issueKey: string; transitionId: string };
  }
) {
  try {
    const issueRoute = await resolveIssueRouteParams(params, ['transitionId']);
    if ('response' in issueRoute) {
      return issueRoute.response;
    }
    const { issueKey } = issueRoute;
    const { transitionId } = issueRoute.params;

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const fields = await issueTracker.getTransitionFields(issueKey, transitionId);

    return NextResponse.json({ fields });
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: unknown }; message?: string };
    console.error('Error fetching transition fields:', {
      message: err?.message,
      status: err?.response?.status,
      data: err?.response?.data,
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch transition fields',
        details: err?.response?.data ?? err?.message,
      },
      { status: 500 }
    );
  }
}
