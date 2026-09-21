import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { loadSprintContextForOrganization } from '@/lib/sprints/loadSprintContextForOrganization';
import { tryRequireSprintContextMcpAuth } from '@/lib/sprints/sprintContextAuth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  try {
    const mcpAuth = await tryRequireSprintContextMcpAuth(request);
    const tenantResult = mcpAuth ?? (await requireTenantContext(request));
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }

    const { sprintId: sprintIdStr } = await resolveParams(params);
    const sprintId = parseInt(sprintIdStr, 10);
    if (Number.isNaN(sprintId)) {
      return NextResponse.json({ error: 'Invalid sprint ID' }, { status: 400 });
    }

    const featureIdParam = new URL(request.url).searchParams.get('featureId');
    const featureId = featureIdParam?.trim() || undefined;
    const useStoredTracker = mcpAuth != null;

    const payload = await loadSprintContextForOrganization({
      featureId,
      organizationId: tenantResult.ctx.organizationId,
      request: useStoredTracker ? null : request,
      sprintId,
      useStoredTracker,
    });

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return handleApiError(error, 'fetch sprint context');
  }
}
