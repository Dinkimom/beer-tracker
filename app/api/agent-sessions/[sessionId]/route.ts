import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  AgentSessionNotFoundError,
  setUserAgentSessionStatus,
} from '@/lib/agentSessions/agentSessionService';
import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';

interface RouteParams { params: Promise<{ sessionId: string }> | { sessionId: string } }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BodySchema = z.object({ status: z.enum(['closed', 'waiting_agent']) });

/** Закрыть свою сессию (или снова отдать агенту). */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { sessionId } = await resolveParams(params);
    if (!UUID_RE.test(sessionId)) {
      return NextResponse.json({ error: 'Agent session not found' }, { status: 404 });
    }
    const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    const session = await setUserAgentSessionStatus({
      organizationId: tenantResult.ctx.organizationId,
      ownerId: tenantResult.ctx.userId,
      sessionId,
      status: parsed.data.status,
    });
    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof AgentSessionNotFoundError) {
      return NextResponse.json({ error: 'Agent session not found' }, { status: 404 });
    }
    console.error('Error updating agent session:', error);
    return NextResponse.json({ error: 'Failed to update agent session' }, { status: 500 });
  }
}
