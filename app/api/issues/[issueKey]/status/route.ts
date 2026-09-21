import { NextRequest, NextResponse } from 'next/server';

import {
  completeIssueStatusChange,
  patchIssueStatusErrorResponse,
  sprintIdsFromIssueSprint,
} from '@/lib/issues/issuesRouteHelpers';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { resolveParams } from '@/lib/nextjs-utils';

interface TransitionBody {
  comment?: string;
  resolution?: string;
  [key: string]: unknown;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> | { issueKey: string } }
) {
  try {
    const { issueKey } = await resolveParams(params);
    const body = await request.json();
    const { transitionId } = body;
    const targetStatusKey = typeof body.targetStatusKey === 'string' ? body.targetStatusKey.trim() : '';

    if (!issueKey) {
      return NextResponse.json(
        { error: 'issueKey is required' },
        { status: 400 }
      );
    }

    if (!transitionId) {
      return NextResponse.json(
        { error: 'transitionId is required' },
        { status: 400 }
      );
    }

    const transitionBody: TransitionBody = { ...body };
    delete transitionBody.transitionId;
    delete transitionBody.targetStatusKey;

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);

    const issue = await issueTracker.getIssue(issueKey);
    const sprintIds = sprintIdsFromIssueSprint(issue?.sprint);

    await issueTracker.transitionIssue(issueKey, String(transitionId), transitionBody);

    completeIssueStatusChange({
      issueKey,
      request,
      sprintIds,
      statusKey: targetStatusKey || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: { errorMessages?: string[] } } };
    console.error('Error updating issue status:', {
      status: err?.response?.status,
      data: err?.response?.data,
      message: (error as Error)?.message,
    });
    return patchIssueStatusErrorResponse(error);
  }
}
