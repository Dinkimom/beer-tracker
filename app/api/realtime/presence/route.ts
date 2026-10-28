import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { updateSprintPresenceFocus } from '@/lib/realtime/sprintPresence';
import { SprintPresenceFocusBodySchema } from '@/lib/realtime/sprintPresenceFocusBody';
import { getRealtimeClientIdFromRequest } from '@/lib/realtime/sprintRealtimeClientId';
import { requestWithOrganizationHeader } from '@/lib/realtime/sprintRealtimeSse';
import { formatValidationError, validateRequest } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function PUT(request: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const validation = validateRequest(SprintPresenceFocusBodySchema, body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: formatValidationError(validation.error) },
      { status: 400 }
    );
  }
  const { attention, boardView, focus, gesture, organizationId, sprintId } = validation.data;
  const tenantResult = await requireTenantContext(requestWithOrganizationHeader(request, organizationId));
  if (!('ctx' in tenantResult)) {
    return tenantResult.response;
  }
  if (tenantResult.ctx.organizationId !== organizationId) {
    return NextResponse.json({ error: 'Нет доступа к организации' }, { status: 403 });
  }
  const clientId = getRealtimeClientIdFromRequest(request);
  if (!clientId) {
    return NextResponse.json({ error: 'Missing realtime client id' }, { status: 400 });
  }
  const applied = await updateSprintPresenceFocus(
    organizationId,
    sprintId,
    clientId,
    focus,
    boardView,
    gesture,
    attention
  );
  return NextResponse.json({ applied: applied !== 'missing' });
}
