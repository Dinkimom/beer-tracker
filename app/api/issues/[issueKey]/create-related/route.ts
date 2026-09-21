import { NextRequest, NextResponse } from 'next/server';

import { TRACKER_UPSTREAM_FORWARD_STATUSES, handleApiError } from '@/lib/api-error-handler';
import { completeCreatedIssueInSprint } from '@/lib/issues/issueSprintMembershipRealtime';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { rejectUnsupportedIssueTrackerCapability } from '@/lib/issueTrackerProvider/issueTrackerCapabilityRoute';
import { resolveParams } from '@/lib/nextjs-utils';
import { CreateRelatedIssueSchema, formatValidationError, validateRequest } from '@/lib/validation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> | { issueKey: string } }
) {
  try {
    const { issueKey } = await resolveParams(params);

    if (!issueKey) {
      return NextResponse.json(
        { error: 'issueKey is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Валидация через Zod
    const validation = validateRequest(CreateRelatedIssueSchema, body);
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
      'supportsRelatedIssues',
      'createRelatedIssue'
    );
    if (unsupported) {
      return unsupported;
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const newIssue = await issueTracker.createRelatedIssue(issueKey, validation.data);
    const createdKey =
      newIssue && typeof newIssue === 'object' && 'key' in newIssue
        ? String((newIssue as { key: unknown }).key)
        : '';
    await completeCreatedIssueInSprint({
      issueKey: createdKey,
      issueTracker,
      request,
      sprintId: validation.data.sprintId,
    });

    return NextResponse.json({
      success: true,
      issue: newIssue,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'Source issue has no queue' || error.message === 'Source issue has no type')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleApiError(error, 'create related issue', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
