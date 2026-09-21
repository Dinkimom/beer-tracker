import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { clearTaskLinksForSprint } from '@/lib/sprints';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;
    const { sprintId: sprintIdStr } = await resolveParams(params);
    const sprintId = parseInt(sprintIdStr, 10);

    if (isNaN(sprintId)) {
      return NextResponse.json(
        { error: 'Invalid sprint ID' },
        { status: 400 }
      );
    }

    await clearTaskLinksForSprint({ organizationId, sprintId });

    notifySprintRealtime(request, organizationId, sprintId, ['links']);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing links:', error);
    return NextResponse.json(
      { error: 'Failed to clear links' },
      { status: 500 }
    );
  }
}
