import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { fetchOccupancyTaskOrder, upsertOccupancyTaskOrder } from '@/lib/sprints';

export async function GET(
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

    const order = await fetchOccupancyTaskOrder({ organizationId, sprintId });
    if (!order) {
      return NextResponse.json({ order: null });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('[GET /occupancy-task-order] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch occupancy task order' },
      { status: 500 }
    );
  }
}

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
      return NextResponse.json(
        { error: 'Invalid sprint ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parentIds = Array.isArray(body.parentIds) ? body.parentIds : [];
    const taskOrders = body.taskOrders && typeof body.taskOrders === 'object' ? body.taskOrders : {};
    const order = { parentIds, taskOrders };

    await upsertOccupancyTaskOrder({ order, organizationId, sprintId });

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('[PUT /occupancy-task-order] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save occupancy task order' },
      { status: 500 }
    );
  }
}
