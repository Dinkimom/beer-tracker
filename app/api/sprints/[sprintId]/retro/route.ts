import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { fetchRetroBoard, readRetroSavePayload, upsertRetroBoard } from '@/lib/retro/retroBoardRepository';

async function readSprintId(
  params: Promise<{ sprintId: string }> | { sprintId: string }
): Promise<number | null> {
  const { sprintId: sprintIdStr } = await resolveParams(params);
  const sprintId = parseInt(sprintIdStr, 10);
  return Number.isNaN(sprintId) ? null : sprintId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const sprintId = await readSprintId(params);
    if (sprintId == null) {
      return NextResponse.json({ error: 'Invalid sprint ID' }, { status: 400 });
    }

    const board = await fetchRetroBoard({
      organizationId: tenantResult.ctx.organizationId,
      sprintId,
    });
    return NextResponse.json({ board });
  } catch (error) {
    console.error('[GET /retro] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch retro board' }, { status: 500 });
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
    const sprintId = await readSprintId(params);
    if (sprintId == null) {
      return NextResponse.json({ error: 'Invalid sprint ID' }, { status: 400 });
    }

    const payload = readRetroSavePayload(await request.json().catch(() => null));
    const board = await upsertRetroBoard({
      base: payload.base,
      board: payload.board,
      organizationId: tenantResult.ctx.organizationId,
      sprintId,
    });
    if (!board) {
      return NextResponse.json({ error: 'Invalid retro board' }, { status: 400 });
    }
    notifySprintRealtime(request, tenantResult.ctx.organizationId, sprintId, ['retro']);
    return NextResponse.json({ board, success: true });
  } catch (error) {
    console.error('[PUT /retro] Error:', error);
    return NextResponse.json({ error: 'Failed to save retro board' }, { status: 500 });
  }
}
