import type { Task } from '@/types';

import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { resolveParams } from '@/lib/nextjs-utils';
import { enrichTasksWithOverseerHdCounts } from '@/lib/overseer/hdCountRead';
import {
  buildCloseP4ApprovalComment,
  mergeTrackerTags,
  resolveCloseP4Tag,
  type SlaBugCloseP4Action,
} from '@/lib/slaBugs/closeP4Actions';
import { taskToSlaBugInput } from '@/lib/slaBugs/parseSlaBugFields';
import { createTrackerApiFromRequest } from '@/lib/tracker-client';
import { loadTrackerIntegrationForOrganization } from '@/lib/trackerIntegration';

async function buildSlaBugApprovalComment(mappedTask: Task): Promise<string> {
  let enrichedTask = mappedTask;
  try {
    [enrichedTask] = await enrichTasksWithOverseerHdCounts([mappedTask]);
  } catch (error) {
    console.warn('[sla-bug-close-action] overseer HD enrichment failed, using task fields:', error);
  }
  return buildCloseP4ApprovalComment(
    taskToSlaBugInput(enrichedTask) ?? {
      createdAt: enrichedTask.createdAt,
      hdCount: enrichedTask.hdCount ?? 0,
      lastHdAt: enrichedTask.lastHdAt,
    }
  );
}

function isAllowedSlaBugCloseAction(
  action: string | undefined
): action is 'keep' | 'send_for_approval' {
  return action === 'keep' || action === 'send_for_approval';
}

async function applySlaBugCloseP4Action(
  request: NextRequest,
  organizationId: string,
  issueKey: string,
  action: SlaBugCloseP4Action
) {
  const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
  const integration = await loadTrackerIntegrationForOrganization(organizationId);
  const issue = await issueTracker.getIssue(issueKey);
  if (!issue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  const rawIssue = issue.raw as Record<string, unknown> | undefined;
  const tag = resolveCloseP4Tag(action);
  await issueTracker.updateIssue(issueKey, { tags: mergeTrackerTags(rawIssue?.tags, tag) });

  let approvalComment: string | null = null;
  if (action === 'send_for_approval') {
    approvalComment = await buildSlaBugApprovalComment(
      issueTracker.mapIssueToTask(issue, integration)
    );
    const api = await createTrackerApiFromRequest(request);
    await api.post(`/issues/${issueKey}/comments`, { text: approvalComment });
  }

  return NextResponse.json({ success: true, tag, approvalComment });
}

export async function handleSlaBugCloseActionPost(
  request: NextRequest,
  params: Promise<{ issueKey: string }> | { issueKey: string }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }

    const { issueKey } = await resolveParams(params);
    if (!issueKey?.trim()) {
      return NextResponse.json({ error: 'issueKey is required' }, { status: 400 });
    }

    const body = (await request.json()) as { action?: string };
    if (!isAllowedSlaBugCloseAction(body.action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return applySlaBugCloseP4Action(
      request,
      tenantResult.ctx.organizationId,
      issueKey,
      body.action
    );
  } catch (error) {
    return handleApiError(error, 'apply SLA bug close P4 action');
  }
}
