import { NextRequest, NextResponse } from 'next/server';

import { createAgentSessionFromRequest } from '@/lib/agentSessions/agentSessionRouteHelpers';
import { quarterScope } from '@/lib/agentSessions/agentSessionScope';
import { listAgentSessionsForOwner } from '@/lib/agentSessions/agentSessionService';
import { requireQuarterQuery } from '@/lib/quarterlyPlans/quarterlyPlanRouteHelpers';

/** GET /api/quarterly-plans/agent-sessions?year=&quarter= — свои сессии с агентом по квартальному плану. */
export async function GET(request: NextRequest) {
  try {
    const route = await requireQuarterQuery(request);
    if ('response' in route) return route.response;
    const result = await listAgentSessionsForOwner({
      organizationId: route.ctx.organizationId,
      ownerId: route.ctx.userId,
      scope: quarterScope(route.input),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error loading quarterly plan agent sessions:', error);
    return NextResponse.json({ error: 'Failed to load agent sessions' }, { status: 500 });
  }
}

/** POST ?year=&quarter= — «Агенту»: новая сессия с просьбой по квартальному плану. */
export async function POST(request: NextRequest) {
  try {
    const route = await requireQuarterQuery(request);
    if ('response' in route) return route.response;
    return await createAgentSessionFromRequest(request, route.ctx, quarterScope(route.input));
  } catch (error) {
    console.error('Error creating quarterly plan agent session:', error);
    return NextResponse.json({ error: 'Failed to create agent session' }, { status: 500 });
  }
}
