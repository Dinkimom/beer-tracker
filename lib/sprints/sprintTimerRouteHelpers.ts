import { NextRequest, NextResponse } from 'next/server';

import { resolveSprintPresenceViewer } from '@/lib/realtime/sprintPresenceViewer';
import { getRealtimeClientIdFromRequest } from '@/lib/realtime/sprintRealtimeClientId';
import { SprintTimerActionBodySchema } from '@/lib/realtime/sprintTimerBody';
import { mutateSprintTimerState, readSprintTimerState } from '@/lib/realtime/sprintTimerStore';
import { formatValidationError, validateRequest } from '@/lib/validation';

import { requireSprintRouteContext } from './sprintRouteContext';

export async function getSprintTimer(
  request: NextRequest,
  params: Promise<{ sprintId: string }> | { sprintId: string }
): Promise<Response> {
  const route = await requireSprintRouteContext(request, params);
  if (!('ctx' in route)) {
    return route.response;
  }
  const { ctx: tenant, sprintId } = route;
  const timer = await readSprintTimerState(tenant.organizationId, sprintId);
  return NextResponse.json({ timer });
}

export async function postSprintTimer(
  request: NextRequest,
  params: Promise<{ sprintId: string }> | { sprintId: string }
): Promise<Response> {
  const route = await requireSprintRouteContext(request, params);
  if (!('ctx' in route)) {
    return route.response;
  }
  const { ctx: tenant, sprintId } = route;
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
