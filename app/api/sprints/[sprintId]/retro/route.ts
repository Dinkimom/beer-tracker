import { NextRequest, NextResponse } from 'next/server';

import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { fetchRetroBoard, readRetroSavePayload, upsertRetroBoard } from '@/lib/retro/retroBoardRepository';
import { requireSprintRouteContext } from '@/lib/sprints/sprintRouteContext';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  try {
    const tenantResult = await requireSprintRouteContext(request, params);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { sprintId } = tenantResult;

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
    const tenantResult = await requireSprintRouteContext(request, params);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { sprintId } = tenantResult;

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
