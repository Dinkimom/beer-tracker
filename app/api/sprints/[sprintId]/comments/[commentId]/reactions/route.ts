import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { toggleSprintCommentReaction } from '@/lib/comments/commentReactionsRepository';
import { isStickyNoteReactionEmoji } from '@/lib/comments/stickyNoteReaction';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { requireSprintRouteContext } from '@/lib/sprints/sprintRouteContext';
import {
  CommentReactionToggleSchema,
  formatValidationError,
  validateRequest,
} from '@/lib/validation';

export async function PUT(
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

    const body: unknown = await request.json();
    const validation = validateRequest(CommentReactionToggleSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }
    if (!isStickyNoteReactionEmoji(validation.data.emoji)) {
      return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
    }

    const result = await toggleSprintCommentReaction({
      commentId,
      emoji: validation.data.emoji,
      organizationId: tenantResult.ctx.organizationId,
      sprintId,
      userId: tenantResult.ctx.userId,
    });
    if ('notFound' in result) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    notifySprintRealtime(request, tenantResult.ctx.organizationId, sprintId, ['reactions']);
    return NextResponse.json({ reactions: result.reactions });
  } catch (error) {
    console.error('Error toggling comment reaction:', error);
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 });
  }
}
