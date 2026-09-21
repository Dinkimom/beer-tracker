import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { parseCommentParent, readCommentParentUpdate } from '@/lib/comments/commentParent';
import { attachCommentReactionSummaries } from '@/lib/comments/commentReactionsRepository';
import { parseOptionalStickyNoteColor, parseStickyNoteColor } from '@/lib/comments/stickyNoteColor';
import { resolveParams } from '@/lib/nextjs-utils';
import { notifyCommentMentionsIfNeeded } from '@/lib/notifications/notifyCommentMentionsIfNeeded';
import { resolveNotificationBoardIdFromRequest } from '@/lib/notifications/resolveNotificationBoardIdFromRequest';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import {
  deleteSprintComment,
  getSprintCommentText,
  insertSprintComment,
  listSprintComments,
  updateSprintComment,
} from '@/lib/sprints';
import {
  CommentSchema,
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

    const comments = await listSprintComments({ organizationId, sprintId });
    const commentsWithReactions = await attachCommentReactionSummaries({
      comments: comments as Array<{ id: string }>,
      organizationId,
      userId: tenantResult.ctx.userId,
    });
    return NextResponse.json({ comments: commentsWithReactions });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
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

    const validation = validateRequest(CommentSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const {
      id,
      assigneeId,
      text,
      x,
      y,
      day,
      part,
      width,
      height,
      color,
      imageFileId,
      kind,
      parent,
      skipMentionNotifications,
    } = validation.data;

    const comment = await insertSprintComment({
      assigneeId,
      color: parseStickyNoteColor(color),
      commentId: id || undefined,
      createdBy: tenantResult.ctx.userId,
      day,
      height,
      imageFileId,
      kind,
      parent: parent === undefined ? null : (parseCommentParent(parent) ?? null),
      organizationId,
      part,
      sprintId,
      text,
      width,
      x,
      y,
    });

    const savedComment = comment as { id?: string } | undefined;
    const commentId = savedComment?.id ?? id;
    if (commentId && (kind == null || kind === 'text') && !skipMentionNotifications) {
      notifyCommentMentionsIfNeeded({
        actorUserId: tenantResult.ctx.userId,
        commentId,
        isUpdate: false,
        organizationId,
        resolveBoardId: resolveNotificationBoardIdFromRequest(request, sprintId),
        sprintId,
        text,
      });
    }

    notifySprintRealtime(request, organizationId, sprintId, ['comments']);
    return NextResponse.json({ comment });
  } catch (error) {
    console.error('Error saving comment:', error);
    return NextResponse.json(
      { error: 'Failed to save comment' },
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
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (isNaN(sprintId) || !commentId) {
      return NextResponse.json(
        { error: 'Invalid sprint ID or comment ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { text, x, y, width, height, assigneeId, day, part, color } = body;
    const parentUpdate = readCommentParentUpdate(body);

    const previousText =
      typeof text === 'string'
        ? await getSprintCommentText({ commentId, organizationId, sprintId })
        : null;

    const { row } = await updateSprintComment({
      assigneeId,
      color: parseOptionalStickyNoteColor(color),
      commentId,
      day,
      height,
      organizationId,
      parent: parentUpdate.provided ? parentUpdate.parent : null,
      parentProvided: parentUpdate.provided,
      part,
      sprintId,
      text,
      width,
      x,
      y,
    });

    if (!row) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    if (typeof text === 'string') {
      notifyCommentMentionsIfNeeded({
        actorUserId: tenantResult.ctx.userId,
        commentId,
        isUpdate: true,
        organizationId,
        previousText,
        resolveBoardId: resolveNotificationBoardIdFromRequest(request, sprintId),
        sprintId,
        text,
      });
    }

    notifySprintRealtime(request, organizationId, sprintId, ['comments']);
    return NextResponse.json({ comment: row });
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
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
    const commentId = searchParams.get('commentId');

    if (isNaN(sprintId) || !commentId) {
      return NextResponse.json(
        { error: 'Invalid sprint ID or comment ID' },
        { status: 400 }
      );
    }

    await deleteSprintComment({ commentId, organizationId, sprintId });

    notifySprintRealtime(request, organizationId, sprintId, ['comments']);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
