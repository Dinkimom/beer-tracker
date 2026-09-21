import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { resolveSprintPresenceViewer } from '@/lib/realtime/sprintPresenceViewer';
import { getRealtimeClientIdFromRequest } from '@/lib/realtime/sprintRealtimeClientId';
import { SprintTimerActionBodySchema } from '@/lib/realtime/sprintTimerBody';
import { mutateSprintTimerState, readSprintTimerState } from '@/lib/realtime/sprintTimerStore';
import { formatValidationError, validateRequest } from '@/lib/validation';

function parseSprintIdParam(sprintId: string): number | null {
  const parsed = Number.parseInt(sprintId, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

async function requireSprintTimerTenant(
  request: NextRequest
): Promise<NextResponse | { organizationId: string; userId: string }> {
  const tenantResult = await requireTenantContext(request);
  if (!('ctx' in tenantResult)) {
    return tenantResult.response;
  }
  return { organizationId: tenantResult.ctx.organizationId, userId: tenantResult.ctx.userId };
}

export async function getSprintTimer(
  request: NextRequest,
  params: Promise<{ sprintId: string }> | { sprintId: string }
): Promise<Response> {
  const tenant = await requireSprintTimerTenant(request);
  if (tenant instanceof NextResponse) {
    return tenant;
  }
  const { sprintId: sprintIdStr } = await resolveParams(params);
  const sprintId = parseSprintIdParam(sprintIdStr);
  if (sprintId == null) {
    return NextResponse.json({ error: 'Invalid sprint ID' }, { status: 400 });
  }
  const timer = await readSprintTimerState(tenant.organizationId, sprintId);
  return NextResponse.json({ timer });
}

export async function postSprintTimer(
  request: NextRequest,
  params: Promise<{ sprintId: string }> | { sprintId: string }
): Promise<Response> {
  const tenant = await requireSprintTimerTenant(request);
  if (tenant instanceof NextResponse) {
    return tenant;
  }
  const { sprintId: sprintIdStr } = await resolveParams(params);
  const sprintId = parseSprintIdParam(sprintIdStr);
  if (sprintId == null) {
    return NextResponse.json({ error: 'Invalid sprint ID' }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const validation = validateRequest(SprintTimerActionBodySchema, body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: formatValidationError(validation.error) },
      { status: 400 }
    );
  }
  const viewer = await resolveSprintPresenceViewer(tenant.userId);
  const timer = await mutateSprintTimerState({
    action: validation.data,
    actor: { displayName: viewer.displayName, userId: viewer.userId },
    organizationId: tenant.organizationId,
    originClientId: getRealtimeClientIdFromRequest(request),
    sprintId,
  });
  return NextResponse.json({ timer });
}
