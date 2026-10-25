import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSprintCommentImage } from '@/lib/sprints';
import { requireSprintRouteContext } from '@/lib/sprints/sprintRouteContext';

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ commentId: string; sprintId: string }> | { commentId: string; sprintId: string };
  }
) {
  try {
    const tenantResult = await requireSprintRouteContext(request, params);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { sprintId } = tenantResult;
    const { commentId } = tenantResult.params;

    if (!z.string().uuid().safeParse(commentId).success) {
      return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 });
    }

    const image = await getSprintCommentImage({
      commentId,
      organizationId: tenantResult.ctx.organizationId,
      sprintId,
    });
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return new NextResponse(Uint8Array.from(image.data), {
      headers: {
        'Cache-Control': 'private, max-age=3600',
        'Content-Type': image.contentType,
      },
    });
  } catch (error) {
    console.error('Error fetching comment image:', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}
