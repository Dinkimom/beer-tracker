import { applyPendingCommentReplacements } from '@/lib/sprints/sprintCommentReplacements';
import {
  confirmAllPendingSprintComments,
  confirmPendingSprintComments,
  deleteAllPendingSprintComments,
  hasConfirmedSprintComment,
} from '@/lib/sprints/sprintCommentsRepository';

/**
 * Принять один черновик агента. Как «Принять всё», только автор драфта (`ownerId`) может его
 * принять: чужой pending-черновик не виден и не принимается (→ `not_found`).
 */
export async function approvePendingSprintComment(input: {
  commentId: string;
  ownerId: string;
  sprintId: number;
}): Promise<'not_found' | 'ok'> {
  // Черновик-замена: принять — значит перенести правку в оригинал, а копию убрать.
  const replaced = await applyPendingCommentReplacements({
    commentIds: [input.commentId],
    ownerId: input.ownerId,
    sprintId: input.sprintId,
  });
  if (replaced > 0) {
    return 'ok';
  }
  const count = await confirmPendingSprintComments({
    commentIds: [input.commentId],
    ownerId: input.ownerId,
    sprintId: input.sprintId,
  });
  if (count > 0) {
    return 'ok';
  }
  // Повторный клик по уже принятой заметке — не ошибка; чужой черновик — не найден.
  const alreadyConfirmed = await hasConfirmedSprintComment({
    commentId: input.commentId,
    sprintId: input.sprintId,
  });
  return alreadyConfirmed ? 'ok' : 'not_found';
}

export async function approveAllPendingSprintComments(input: {
  ownerId: string;
  sprintId: number;
}): Promise<number> {
  const replaced = await applyPendingCommentReplacements(input);
  return replaced + (await confirmAllPendingSprintComments(input));
}

export function rejectAllPendingSprintComments(input: {
  ownerId: string;
  sprintId: number;
}): Promise<number> {
  return deleteAllPendingSprintComments(input);
}
