import {
  diffNewStickyNoteMentionAssigneeIds,
  formatStickyNoteTextForPreview,
  parseStickyNoteMentionAssigneeIds,
} from '@/lib/comments/stickyNoteMentions';
import { emitCommentMentionNotifications } from '@/lib/notifications/emitUserNotifications';
import { fireAndForgetNotification } from '@/lib/notifications/fireAndForgetNotification';

/**
 * Fire-and-forget: уведомления упомянутым в тексте заметки.
 * Только для текстовых заметок (`kind` text или не задан): у фото/схемы/виджета `text` — подпись
 * или имя сцены, упоминаний там нет — одинаково для создания (POST) и правки (PUT).
 */
export function notifyCommentMentionsIfNeeded(input: {
  actorUserId: string;
  commentId: string;
  isUpdate: boolean;
  kind?: string | null;
  organizationId: string;
  previousText?: string | null;
  resolveBoardId?: () => Promise<number | undefined>;
  sprintId: number;
  text: string;
}): void {
  if (input.kind != null && input.kind !== 'text') {
    return;
  }
  const mentionAssigneeIds = input.isUpdate
    ? diffNewStickyNoteMentionAssigneeIds(input.previousText ?? '', input.text)
    : parseStickyNoteMentionAssigneeIds(input.text);
  if (mentionAssigneeIds.length === 0) {
    return;
  }

  fireAndForgetNotification(async () => {
    const boardId = input.resolveBoardId ? await input.resolveBoardId() : undefined;
    await emitCommentMentionNotifications({
      actorUserId: input.actorUserId,
      boardId,
      commentId: input.commentId,
      commentPreview: formatStickyNoteTextForPreview(input.text),
      mentionAssigneeIds,
      organizationId: input.organizationId,
      sprintId: input.sprintId,
    });
  }, '[notifyCommentMentionsIfNeeded]');
}
