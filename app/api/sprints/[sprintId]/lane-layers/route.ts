import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { writeSwimlaneCardLayers } from '@/lib/sprints/swimlaneCardLayersRepository';
import { SwimlaneCardLayersSchema, formatValidationError, validateRequest } from '@/lib/validation';

/** Ручные слои карточек в строках свимлейна (перетаскивание, фиксация при выключении автосортировки). */
export async function PUT(
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
      return NextResponse.json({ error: 'Invalid sprint ID' }, { status: 400 });
    }

    const validation = validateRequest(SwimlaneCardLayersSchema, await request.json());
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    await writeSwimlaneCardLayers({
      layers: validation.data.layers,
      organizationId,
      sprintId,
    });

    notifySprintRealtime(request, organizationId, sprintId, ['positions']);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'save swimlane card layers');
  }
}
