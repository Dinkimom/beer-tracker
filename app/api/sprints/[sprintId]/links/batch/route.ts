import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { persistBatchTaskLinks } from '@/lib/sprints';
import { BatchLinksSchema, formatValidationError, validateRequest } from '@/lib/validation';

function parseSprintIdParam(sprintIdStr: string): NextResponse | number {
  const sprintId = parseInt(sprintIdStr, 10);
  if (isNaN(sprintId)) {
    return NextResponse.json({ error: 'Invalid sprint ID' }, { status: 400 });
  }
  return sprintId;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }

    const { sprintId: sprintIdStr } = await resolveParams(params);
    const sprintId = parseSprintIdParam(sprintIdStr);
    if (sprintId instanceof NextResponse) {
      return sprintId;
    }

    const body = await request.json();
    const validation = validateRequest(BatchLinksSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const count = await persistBatchTaskLinks({
      links: validation.data.links,
      organizationId: tenantResult.ctx.organizationId,
      sprintId,
    });

    notifySprintRealtime(request, tenantResult.ctx.organizationId, sprintId, ['links']);
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Error saving batch links:', error);
    return NextResponse.json({ error: 'Failed to save batch links' }, { status: 500 });
  }
}
