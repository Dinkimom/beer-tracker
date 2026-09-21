import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { getSprintCommentDiagramScene, putSprintCommentDiagramScene } from '@/lib/sprints';
import { parseDiagramSceneBody } from '@/lib/sprints/sprintCommentDiagramRouteHelpers';

async function parseDiagramRouteParams(
  params: Promise<{ commentId: string; sprintId: string }> | { commentId: string; sprintId: string }
): Promise<{ commentId: string; sprintId: number } | null> {
  const { commentId, sprintId: sprintIdStr } = await resolveParams(params);
  const sprintId = parseInt(sprintIdStr, 10);
  if (Number.isNaN(sprintId) || !z.string().uuid().safeParse(commentId).success) {
    return null;
  }
  return { commentId, sprintId };
}

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ commentId: string; sprintId: string }> | { commentId: string; sprintId: string };
  }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const parsedParams = await parseDiagramRouteParams(params);
    if (!parsedParams) {
      return NextResponse.json({ error: 'Invalid sprint ID or comment ID' }, { status: 400 });
    }

    const scene = await getSprintCommentDiagramScene({
      commentId: parsedParams.commentId,
      organizationId: tenantResult.ctx.organizationId,
      sprintId: parsedParams.sprintId,
    });
    if (!scene) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
    }

    return NextResponse.json(
      { scene },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('Error fetching comment diagram:', error);
    return NextResponse.json({ error: 'Failed to fetch diagram' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ commentId: string; sprintId: string }> | { commentId: string; sprintId: string };
  }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const parsedParams = await parseDiagramRouteParams(params);
    if (!parsedParams) {
      return NextResponse.json({ error: 'Invalid sprint ID or comment ID' }, { status: 400 });
    }

    const parsed = parseDiagramSceneBody(await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const result = await putSprintCommentDiagramScene({
      commentId: parsedParams.commentId,
      organizationId: tenantResult.ctx.organizationId,
      scene: parsed.scene,
      sprintId: parsedParams.sprintId,
    });
    if (result === 'not_found') {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
    }
    if (result === 'too_large') {
      return NextResponse.json({ error: 'Diagram is too large' }, { status: 400 });
    }

    notifySprintRealtime(request, tenantResult.ctx.organizationId, parsedParams.sprintId, [
      'comments',
    ]);
    return NextResponse.json({ scene: parsed.scene });
  } catch (error) {
    console.error('Error saving comment diagram:', error);
    return NextResponse.json({ error: 'Failed to save diagram' }, { status: 500 });
  }
}
