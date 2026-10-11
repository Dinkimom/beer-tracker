import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { getRouteParam } from '@/lib/api-utils';
import { taskJsonFromSnapshotRow } from '@/lib/issues/issueTrackerRouteJson';
import { findIssueSnapshot } from '@/lib/snapshots';
import { loadTrackerIntegrationForOrganization } from '@/lib/trackerIntegration';
import { resolveTrackerWebUrlContextForOrganizationId } from '@/lib/trackerRequestConfig';

/**
 * GET /api/issues/[issueKey]/task
 * Возвращает задачу в формате Task для отображения карточки (например, в тултипе колбасы).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> | { issueKey: string } }
) {
  try {
    const issueKey = await getRouteParam(params, 'issueKey');
    if (!issueKey?.trim()) {
      return NextResponse.json({ error: 'issueKey is required' }, { status: 400 });
    }

    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }

    const organizationId = tenantResult.ctx.organizationId;
    const [row, integration, trackerWeb] = await Promise.all([
      findIssueSnapshot(organizationId, issueKey.trim()),
      loadTrackerIntegrationForOrganization(organizationId),
      resolveTrackerWebUrlContextForOrganizationId(organizationId),
    ]);
    if (!row) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const task = taskJsonFromSnapshotRow(row, trackerWeb, integration);
    return NextResponse.json(task);
  } catch (error) {
    return handleApiError(error, 'fetch issue task');
  }
}
