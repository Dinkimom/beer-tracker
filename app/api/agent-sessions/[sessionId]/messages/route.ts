import { NextRequest, NextResponse } from 'next/server';

import { AgentSessionUserMessageSchema } from '@/lib/agentSessions/agentSession';
import {
  AgentSessionNotFoundError,
  postUserAgentSessionMessage,
  withdrawUserAgentSessionMessage,
} from '@/lib/agentSessions/agentSessionService';
import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';

interface RouteParams { params: Promise<{ sessionId: string }> | { sessionId: string } }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readSessionId(params: RouteParams['params']): Promise<string | null> {
  const { sessionId } = await resolveParams(params);
  return UUID_RE.test(sessionId) ? sessionId : null;
}

function notFound() {
  return NextResponse.json({ error: 'Agent session not found' }, { status: 404 });
}

/** 💬 к пункту драфта, «Попросить переделать» или реплика в своей сессии. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const sessionId = await readSessionId(params);
    if (!sessionId) {
      return notFound();
    }
    const parsed = AgentSessionUserMessageSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }
    const session = await postUserAgentSessionMessage({
      message: parsed.data,
      organizationId: tenantResult.ctx.organizationId,
      ownerId: tenantResult.ctx.userId,
      sessionId,
    });
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    if (error instanceof AgentSessionNotFoundError) {
      return notFound();
    }
    console.error('Error posting agent session message:', error);
    return NextResponse.json({ error: 'Failed to post message' }, { status: 500 });
  }
}

/** Отозвать свою реплику, пока агент на неё не ответил. */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const sessionId = await readSessionId(params);
    const messageId = request.nextUrl.searchParams.get('id')?.trim() ?? '';
    if (!sessionId || !UUID_RE.test(messageId)) {
      return notFound();
    }
    const deleted = await withdrawUserAgentSessionMessage({
      messageId,
      organizationId: tenantResult.ctx.organizationId,
      ownerId: tenantResult.ctx.userId,
      sessionId,
    });
    return deleted ? NextResponse.json({ ok: true }) : notFound();
  } catch (error) {
    if (error instanceof AgentSessionNotFoundError) {
      return notFound();
    }
    console.error('Error withdrawing agent session message:', error);
    return NextResponse.json({ error: 'Failed to withdraw message' }, { status: 500 });
  }
}
