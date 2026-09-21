import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { getRouteParam } from '@/lib/api-utils';
import { apiCache, cacheKeys } from '@/lib/cache';
import { getIssueTrackerProviderKind } from '@/lib/env';
import {
  buildIssueDetailResponse,
  loadIssueTrackerChecklistItems,
  resolveIssueDetailSource,
} from '@/lib/issues/issueDetailRouteHelpers';
import { syncPlannerIssueParentAfterTrackerUpdate, trackerParentForIssueUpdate } from '@/lib/issues/issuesRouteHelpers';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { findIssueSnapshot } from '@/lib/snapshots';
import {
  IssueKeyParamSchema,
  UpdateIssueSchema,
  formatValidationError,
  validateRequest,
} from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> | { issueKey: string } }
) {
  try {
    const issueKey = await getRouteParam(params, 'issueKey');
    const validation = validateRequest(IssueKeyParamSchema, { issueKey });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatValidationError(validation.error) },
        { status: 400 }
      );
    }

    const validIssueKey = validation.data.issueKey;
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;

    const cacheKey = cacheKeys.issueDetail(organizationId, validIssueKey);
    const cachedData = apiCache.get<unknown>(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const issue = await resolveIssueDetailSource({
      findIssueSnapshot,
      getIssue: (key) => issueTracker.getIssue(key),
      organizationId,
      validIssueKey,
    });
    if (issue instanceof NextResponse) {
      return issue;
    }

    const checklistItems = await loadIssueTrackerChecklistItems(
      issueTracker,
      validIssueKey,
      getIssueTrackerProviderKind()
    );
    const responseData = buildIssueDetailResponse(issue, checklistItems);
    apiCache.set(cacheKey, responseData, 60);
    return NextResponse.json(responseData);
  } catch (error) {
    return handleApiError(error, 'fetch issue');
  }
}

/**
 * Обновляет задачу (например, название, описание)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> | { issueKey: string } }
) {
  try {
    const issueKey = await getRouteParam(params, 'issueKey');
    if (!issueKey) {
      return NextResponse.json({ error: 'issueKey is required' }, { status: 400 });
    }

    const body = await request.json();
    const validation = validateRequest(UpdateIssueSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatValidationError(validation.error) },
        { status: 400 }
      );
    }

    const { summary, description, parent, sprintId } = validation.data;
    const updateBody: { description?: string; parent?: string | null; summary?: string } = {};
    if (summary !== undefined) updateBody.summary = summary;
    if (description !== undefined) updateBody.description = description;
    const trackerParent = trackerParentForIssueUpdate(parent);
    if (trackerParent !== undefined) updateBody.parent = trackerParent;

    if (Object.keys(updateBody).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const data = await issueTracker.updateIssue(issueKey, updateBody);
    if (trackerParent !== undefined) {
      await syncPlannerIssueParentAfterTrackerUpdate({
        issueKey,
        issueTracker,
        parentKey: trackerParent,
        request,
        sprintId,
      });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating issue:', error);
    return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 });
  }
}
