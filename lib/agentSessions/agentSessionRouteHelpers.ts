import type { AgentSessionScope } from './agentSessionScope';
import type { TenantContext } from '@/lib/api-tenant';

import { NextResponse } from 'next/server';

import { AgentSessionCreateSchema } from './agentSession';
import { createPlannerAgentSession } from './agentSessionService';

/**
 * POST «Агенту» из планера (спринт или квартал): тело — `AgentSessionCreateSchema`, ответ — новая сессия.
 * Квартальная сессия бывает только про план (`kind: 'plan'`): разработка задачи живёт в спринте.
 */
export async function createAgentSessionFromRequest(
  request: Request,
  ctx: TenantContext,
  scope: AgentSessionScope
): Promise<NextResponse> {
  const parsed = AgentSessionCreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success || (scope.kind === 'quarter' && parsed.data.kind !== 'plan')) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const session = await createPlannerAgentSession({
    organizationId: ctx.organizationId,
    ownerId: ctx.userId,
    request: parsed.data,
    scope,
  });
  return NextResponse.json({ session }, { status: 201 });
}
