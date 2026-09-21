import type { NotificationKind, NotificationPayload } from '@/lib/notifications/types';

import { toSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';

/** Идентификатор карточки на свимлейне для deep-link из уведомления. */
export function resolveNotificationFocusTaskId(
  kind: NotificationKind,
  payload: NotificationPayload
): string | null {
  if (kind === 'comment_mention') {
    const commentId = payload.commentId?.trim();
    return commentId ? toSwimlaneCommentTaskId(commentId) : null;
  }
  if (kind === 'assignee_changed') {
    const taskId = payload.taskId?.trim();
    return taskId || null;
  }
  return null;
}
