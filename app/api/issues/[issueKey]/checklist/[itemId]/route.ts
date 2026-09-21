import { NextRequest, NextResponse } from 'next/server';

import { handleApiError, TRACKER_UPSTREAM_FORWARD_STATUSES } from '@/lib/api-error-handler';
import { invalidateCache } from '@/lib/cache';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { rejectUnsupportedIssueTrackerCapability } from '@/lib/issueTrackerProvider/issueTrackerCapabilityRoute';
import { resolveParams } from '@/lib/nextjs-utils';
import { UpdateChecklistItemSchema, formatValidationError, validateRequest } from '@/lib/validation';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string; itemId: string }> | { issueKey: string; itemId: string } }
) {
  try {
    const { issueKey, itemId } = await resolveParams(params);

    if (!issueKey || !itemId) {
      return NextResponse.json(
        { error: 'issueKey and itemId are required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Валидация через Zod
    const validation = validateRequest(UpdateChecklistItemSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const { checked, text } = validation.data;
    const updateBody: { checked?: boolean; text?: string } = {};

    if (checked !== undefined) {
      updateBody.checked = checked;
    }
    if (text !== undefined) {
      updateBody.text = text;
    }

    const unsupported = rejectUnsupportedIssueTrackerCapability(
      'supportsChecklists',
      'updateChecklistItem'
    );
    if (unsupported) {
      return unsupported;
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    await issueTracker.updateChecklistItem(issueKey, itemId, updateBody);

    invalidateCache.issueFull(issueKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'update checklist item', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string; itemId: string }> | { issueKey: string; itemId: string } }
) {
  try {
    const { issueKey, itemId } = await resolveParams(params);

    if (!issueKey || !itemId) {
      return NextResponse.json(
        { error: 'issueKey and itemId are required' },
        { status: 400 }
      );
    }

    const unsupported = rejectUnsupportedIssueTrackerCapability(
      'supportsChecklists',
      'deleteChecklistItem'
    );
    if (unsupported) {
      return unsupported;
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    await issueTracker.deleteChecklistItem(issueKey, itemId);

    invalidateCache.issueFull(issueKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'delete checklist item', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
