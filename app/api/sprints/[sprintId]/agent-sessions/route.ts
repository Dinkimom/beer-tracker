import { NextRequest, NextResponse } from 'next/server';

import { AgentSessionCreateSchema } from '@/lib/agentSessions/agentSession';
import {
  createPlannerAgentSession,
  listSprintAgentSessionsForOwner,
} from '@/lib/agentSessions/agentSessionService';
import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';

interface RouteParams { params: Promise<{ sprintId: string }> | { sprintId: string } }

async function readSprintId(params: RouteParams['params']): Promise<number> {
  const { sprintId } = await resolveParams(params);
  return parseInt(sprintId, 10);
}

/** Свои сессии с агентом в спринте (сессии приватны). */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const sprintId = await readSprintId(params);
    if (Number.isNaN(sprintId)) {
      return NextResponse.json({ error: 'Invalid sprint ID' }, { status: 400 });
    }
    const result = await listSprintAgentSessionsForOwner({
      organizationId: tenantResult.ctx.organizationId,
      ownerId: tenantResult.ctx.userId,
      sprintId,
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
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const sprintId = await readSprintId(params);
    if (Number.isNaN(sprintId)) {
      return NextResponse.json({ error: 'Invalid sprint ID' }, { status: 400 });
    }
    const parsed = AgentSessionCreateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const session = await createPlannerAgentSession({
      organizationId: tenantResult.ctx.organizationId,
      ownerId: tenantResult.ctx.userId,
      request: parsed.data,
      sprintId,
    });
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('Error creating agent session:', error);
    return NextResponse.json({ error: 'Failed to create agent session' }, { status: 500 });
  }
}
