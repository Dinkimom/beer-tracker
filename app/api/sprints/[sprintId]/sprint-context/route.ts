import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { loadSprintContextForOrganization } from '@/lib/sprints/loadSprintContextForOrganization';
import { tryRequireSprintContextMcpAuth } from '@/lib/sprints/sprintContextAuth';
import { requireSprintRouteContext } from '@/lib/sprints/sprintRouteContext';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  try {
    const mcpAuth = await tryRequireSprintContextMcpAuth(request);
    const tenantResult = await requireSprintRouteContext(
      request,
      params,
      mcpAuth ?? (await requireTenantContext(request))
    );
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { sprintId } = tenantResult;

    const searchParams = new URL(request.url).searchParams;
    const featureId = searchParams.get('featureId')?.trim() || undefined;
    const assigneeId = searchParams.get('assigneeId')?.trim() || undefined;
    const taskIds = searchParams
      .getAll('taskId')
      .map((value) => value.trim())
      .filter(Boolean);
    const useStoredTracker = mcpAuth != null;

    const payload = await loadSprintContextForOrganization({
      assigneeId,
      featureId,
      organizationId: tenantResult.ctx.organizationId,
      request: useStoredTracker ? null : request,
      sprintId,
      taskIds: taskIds.length > 0 ? taskIds : undefined,
      useStoredTracker,
    });

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return handleApiError(error, 'fetch sprint context');
  }
}
