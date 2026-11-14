import { NextRequest, NextResponse } from 'next/server';

import { createAgentSessionFromRequest } from '@/lib/agentSessions/agentSessionRouteHelpers';
import { sprintScope } from '@/lib/agentSessions/agentSessionScope';
import { listAgentSessionsForOwner } from '@/lib/agentSessions/agentSessionService';
import { requireSprintRouteContext } from '@/lib/sprints/sprintRouteContext';

interface RouteParams { params: Promise<{ sprintId: string }> | { sprintId: string } }

/** Свои сессии с агентом в спринте (сессии приватны). */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const tenantResult = await requireSprintRouteContext(request, params);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { sprintId } = tenantResult;
    const result = await listAgentSessionsForOwner({
      organizationId: tenantResult.ctx.organizationId,
      ownerId: tenantResult.ctx.userId,
      scope: sprintScope(sprintId),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error loading agent sessions:', error);
    return NextResponse.json({ error: 'Failed to load agent sessions' }, { status: 500 });
  }
}

/** «Агенту»: новая сессия с просьбой по задаче или спринту. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const tenantResult = await requireSprintRouteContext(request, params);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    return await createAgentSessionFromRequest(request, tenantResult.ctx, sprintScope(tenantResult.sprintId));
  } catch (error) {
    console.error('Error creating agent session:', error);
    return NextResponse.json({ error: 'Failed to create agent session' }, { status: 500 });
  }
}
