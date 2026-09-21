import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { completeCreatedIssueInSprint } from '@/lib/issues/issueSprintMembershipRealtime';
import { buildCreateIssueRequestBody } from '@/lib/issues/issuesRouteHelpers';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { loadTrackerIntegrationForOrganization } from '@/lib/trackerIntegration';
import { CreateIssueSchema, formatValidationError, validateRequest } from '@/lib/validation';

/**
 * Создает новую задачу в Yandex Tracker
 */
export async function POST(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId } = tenantResult.ctx;

    const body = await request.json();

    // Валидация через Zod
    const validation = validateRequest(CreateIssueSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const { summary, description, assignee, queue, parent, sprintId, priority, type } =
      validation.data;

    const requestBody = buildCreateIssueRequestBody({
      assignee,
      description,
      parent,
      priority,
      queue,
      sprintId,
      summary,
      type,
    });

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const data = await issueTracker.createIssue(requestBody);
    const issueKey = String(data.key);

    const [issue, integration] = await Promise.all([
      issueTracker.getIssue(issueKey),
      loadTrackerIntegrationForOrganization(organizationId),
    ]);
    if (!issue) {
      throw new Error(`Created issue ${issueKey} was not found`);
    }

    const task = issueTracker.mapIssueToTask(issue, integration);

    await completeCreatedIssueInSprint({
      issueKey,
      issueTracker,
      request,
      sprintId,
    });

    return NextResponse.json({
      key: issueKey,
      id: data.id,
      self: data.self,
      task,
    });
  } catch (error) {
    console.error('Error creating issue:', error);
    return NextResponse.json(
      { error: 'Failed to create issue' },
      { status: 500 }
    );
  }
}
