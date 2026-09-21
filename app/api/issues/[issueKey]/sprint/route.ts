import { NextRequest, NextResponse } from 'next/server';

import { invalidateCache } from '@/lib/cache';
import { completeIssueSprintMembershipChange } from '@/lib/issues/issueSprintMembershipRealtime';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { resolveParams } from '@/lib/nextjs-utils';
import {
  AddIssueToSprintSchema,
  UpdateIssueSprintSchema,
  formatValidationError,
  validateRequest,
} from '@/lib/validation';

function invalidateBacklogCaches(boardIds: number[]): void {
  for (const boardId of boardIds) {
    invalidateCache.backlog(boardId);
  }
}

function parsePositiveSprintId(raw: string): number | null {
  const sprintId = Number.parseInt(raw, 10);
  if (!Number.isInteger(sprintId) || sprintId <= 0) {
    return null;
  }
  return sprintId;
}

function sprintIdsFromReplacePayload(sprints: Array<{ id: string }>): number[] {
  return sprints
    .map((sprint) => Number.parseInt(sprint.id, 10))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function normalizeReplaceSprintId(value: unknown): { id: string } {
  if (typeof value === 'string' || typeof value === 'number') {
    return { id: String(value) };
  }
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return { id: String((value as { id: unknown }).id) };
  }
  throw new Error(`Invalid sprint format: ${JSON.stringify(value)}`);
}

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
    const validation = validateRequest(AddIssueToSprintSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const { sprintId } = validation.data;
    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const result = await issueTracker.addIssueToSprint(issueKey, sprintId);

    invalidateBacklogCaches(result.backlogBoardIds);
    await completeIssueSprintMembershipChange({
      addedSprintIds: [sprintId],
      issueKey,
      issueTracker,
      removedSprintIds: result.affectedSprintIds.filter((id) => id !== sprintId),
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating issue sprint:', error);
    return NextResponse.json(
      { error: 'Failed to update issue sprint' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> | { issueKey: string } }
) {
  try {
    const { issueKey } = await resolveParams(params);
    const sprintIdRaw = request.nextUrl.searchParams.get('sprintId');

    if (!issueKey) {
      return NextResponse.json(
        { error: 'issueKey is required' },
        { status: 400 }
      );
    }

    if (!sprintIdRaw) {
      return NextResponse.json(
        { error: 'sprintId is required' },
        { status: 400 }
      );
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const result = await issueTracker.removeIssueFromSprint(issueKey, sprintIdRaw);
    const removedSprintId = parsePositiveSprintId(sprintIdRaw);

    invalidateBacklogCaches(result.backlogBoardIds);
    await completeIssueSprintMembershipChange({
      addedSprintIds: [],
      issueKey,
      issueTracker,
      removedSprintIds: removedSprintId ? [removedSprintId] : result.affectedSprintIds,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing issue from sprint:', error);
    return NextResponse.json(
      { error: 'Failed to remove issue from sprint' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const validation = validateRequest(UpdateIssueSprintSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const sprintIds = validation.data.sprint.map(normalizeReplaceSprintId);
    const nextSprintIds = sprintIdsFromReplacePayload(sprintIds);
    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const result = await issueTracker.replaceIssueSprints(issueKey, sprintIds);

    invalidateBacklogCaches(result.backlogBoardIds);
    await completeIssueSprintMembershipChange({
      addedSprintIds: nextSprintIds,
      issueKey,
      issueTracker,
      removedSprintIds: result.affectedSprintIds.filter((id) => !nextSprintIds.includes(id)),
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating issue sprint:', error);
    return NextResponse.json(
      { error: 'Failed to update issue sprint' },
      { status: 500 }
    );
  }
}
