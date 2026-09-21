import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import {
  deleteTaskLink,
  listTaskLinksForSprint,
  upsertTaskLink,
} from '@/lib/sprints';
import {
  TaskLinkSchema,
  formatValidationError,
  validateRequest,
} from '@/lib/validation';

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

    const links = await listTaskLinksForSprint({ organizationId, sprintId });
    return NextResponse.json(
      { links },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('Error fetching links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch links' },
      { status: 500 }
    );
  }
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

    const validation = validateRequest(TaskLinkSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const { fromTaskId, toTaskId, fromAnchor, toAnchor, id } = validation.data;
    const linkId = id || `link-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const link = await upsertTaskLink({
      fromAnchor,
      fromTaskId,
      linkId,
      organizationId,
      sprintId,
      toAnchor,
      toTaskId,
    });

    notifySprintRealtime(request, organizationId, sprintId, ['links']);
    return NextResponse.json({ link });
  } catch (error) {
    console.error('Error saving link:', error);
    return NextResponse.json(
      { error: 'Failed to save link' },
      { status: 500 }
    );
  }
}

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
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('linkId');

    if (isNaN(sprintId) || !linkId) {
      return NextResponse.json(
        { error: 'Invalid sprint ID or link ID' },
        { status: 400 }
      );
    }

    await deleteTaskLink({ linkId, organizationId, sprintId });

    notifySprintRealtime(request, organizationId, sprintId, ['links']);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting link:', error);
    return NextResponse.json(
      { error: 'Failed to delete link' },
      { status: 500 }
    );
  }
}
