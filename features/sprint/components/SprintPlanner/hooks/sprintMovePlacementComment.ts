import type { Comment } from '@/types';

import { moveSprintComments, saveComment } from '@/lib/beerTrackerApi';

function commentSaveInput(comment: Comment) {
  return {
    assigneeId: comment.assigneeId,
    color: comment.color,
    day: comment.day,
    height: comment.height,
    id: comment.id,
    imageFileId: comment.imageFileId ?? null,
    kind: comment.kind,
    parent: comment.parent ?? null,
    part: comment.part,
    // Повторное сохранение того же текста не должно заново звать упомянутых.
    skipMentionNotifications: true,
    text: comment.text,
    width: comment.width,
    x: comment.x,
    y: comment.y,
  };
}

/**
 * Переносит заметку в спринт и ставит её в первый день той же дорожки.
 * Заметка — данные планера, а не Tracker: переносим сразу, отмена вернёт её назад.
 */
export async function moveCommentToSprintFirstDay(input: {
  comment: Comment;
  fromSprintId: number;
  toSprintId: number;
}): Promise<boolean> {
  const moved = await moveSprintComments(input.fromSprintId, input.toSprintId, [input.comment.id]);
  if (!moved) {
    return false;
  }
  try {
    await saveComment(
      input.toSprintId,
      commentSaveInput({ ...input.comment, day: 0, part: 0, x: 0 }),
      true
    );
  } catch {
    // Заметка уже в целевом спринте, просто на старом месте — её всё равно двигают руками.
  }
  return true;
}

/** Возвращает заметку в исходный спринт на прежнее место. */
export async function revertCommentMove(input: {
  comment: Comment;
  fromSprintId: number;
  toSprintId: number;
}): Promise<boolean> {
  const moved = await moveSprintComments(input.toSprintId, input.fromSprintId, [input.comment.id]);
  if (!moved) {
    return false;
  }
  try {
    await saveComment(input.fromSprintId, commentSaveInput(input.comment), true);
  } catch {
    // Вернулась в спринт, но место не восстановилось — не критично.
  }
  return true;
}
