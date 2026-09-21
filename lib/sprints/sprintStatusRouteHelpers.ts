import type { IssueTrackerSprintStatus } from '@/lib/issueTrackerProvider/types';

import omit from 'lodash-es/omit';
import { NextRequest, NextResponse } from 'next/server';

import { TRACKER_UPSTREAM_FORWARD_STATUSES, handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { apiCache, cacheKeys, invalidateCache } from '@/lib/cache';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { resolveParams } from '@/lib/nextjs-utils';
import { notifySprintLifecycleIfNeeded } from '@/lib/notifications/notifyLifecycleAndAvailability';
import { parseSprintStatusPatch } from '@/lib/sprints/sprintRouteParseHelpers';

function invalidateSprintStatusCaches(sprintIdNum: number, boardId: number | undefined): void {
  invalidateCache.sprint(sprintIdNum);
  if (boardId != null) {
    invalidateCache.sprints(boardId);
  }
  apiCache.deleteByPattern(/^sprints:\d+$/);
}

export function sprintStatusPatchMatchesResult(
  requested: IssueTrackerSprintStatus,
  actual: string | undefined
): boolean {
  if (!actual) {
    return false;
  }
  if (actual === requested) {
    return true;
  }
  return requested === 'released' && actual === 'archived';
}

const SPRINT_INFO_CACHE_TTL_SEC = 10 * 60;

export async function patchSprintStatus(
  request: NextRequest,
  params: Promise<{ sprintId: string }> | { sprintId: string }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId, userId: actorUserId } = tenantResult.ctx;

    const { sprintId } = await resolveParams(params);
    const body = await request.json();
    if (!sprintId) {
      return NextResponse.json({ error: 'sprintId is required' }, { status: 400 });
    }

    const parsed = parseSprintStatusPatch(body);
    if (parsed instanceof NextResponse) {
      return parsed;
    }

    const sprintIdNum = parseInt(sprintId, 10);
    if (Number.isNaN(sprintIdNum)) {
      return NextResponse.json({ error: 'Invalid sprintId' }, { status: 400 });
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const updatedSprint = await issueTracker.updateSprintStatus(
      sprintIdNum,
      parsed.status,
      parsed.version
    );
    if (!updatedSprint) {
      return NextResponse.json({ error: 'Failed to update sprint status' }, { status: 500 });
    }
    if (!sprintStatusPatchMatchesResult(parsed.status, updatedSprint.status)) {
      return NextResponse.json(
        { error: `Tracker did not persist sprint status ${parsed.status}` },
        { status: 500 }
      );
    }

    invalidateSprintStatusCaches(sprintIdNum, updatedSprint.boardId);
    apiCache.set(cacheKeys.sprintInfo(sprintIdNum), omit(updatedSprint, 'boardId'), SPRINT_INFO_CACHE_TTL_SEC);

    notifySprintLifecycleIfNeeded({
      actorUserId,
      boardId: updatedSprint.boardId,
      organizationId,
      sprintId: sprintIdNum,
      sprintName: updatedSprint.name ?? String(sprintIdNum),
      status: parsed.status,
    });

    return NextResponse.json({
      success: true,
      sprint: omit(updatedSprint, 'boardId'),
    });
  } catch (error) {
    return handleApiError(error, 'update sprint status', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}
