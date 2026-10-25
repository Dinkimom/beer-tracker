import type { CommentHistorySlice } from '@/lib/layers/application/mobx/stores/taskPositionsStore';
import type { Comment } from '@/types';

import {
  commentHistorySliceFromComment,
  commentHistorySlicesEqual,
} from '@/lib/layers/application/mobx/stores/taskPositionsStore';

export interface CommentHistoryChange {
  after: CommentHistorySlice;
  before: CommentHistorySlice;
}

/**
 * Применяет правку к заметке и возвращает шаг undo, если изменилась раскладка или родитель
 * (`CommentHistorySlice`: assignee/day/part/width/height/x/y/parent). Текст, цвет и прочие поля
 * в историю планера не попадают — их правка вернёт `history: null`.
 * Заметки нет в списке — возвращается тот же массив (без лишнего ре-рендера).
 */
export function applyCommentChangeWithHistory(
  comments: Comment[],
  commentId: string,
  change: (comment: Comment) => Comment
): { comments: Comment[]; history: CommentHistoryChange | null } {
  const current = comments.find((comment) => comment.id === commentId);
  if (!current) {
    return { comments, history: null };
  }
  const next = change(current);
  const before = commentHistorySliceFromComment(current);
  const after = commentHistorySliceFromComment(next);
  return {
    comments: comments.map((comment) => (comment.id === commentId ? next : comment)),
    history: commentHistorySlicesEqual(before, after) ? null : { after, before },
  };
}
