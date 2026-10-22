import { applyPendingCommentReplacements } from '@/lib/sprints/sprintCommentReplacements';
import {
  confirmAllPendingSprintComments,
  confirmPendingSprintComments,
  deleteAllPendingSprintComments,
  hasSprintComment,
} from '@/lib/sprints/sprintCommentsRepository';

export async function approvePendingSprintComment(input: {
  commentId: string;
  sprintId: number;
}): Promise<'not_found' | 'ok'> {
  // Черновик-замена: принять — значит перенести правку в оригинал, а копию убрать.
  const replaced = await applyPendingCommentReplacements({ commentIds: [input.commentId], sprintId: input.sprintId });
  if (replaced > 0) {
    return 'ok';
  }
  const count = await confirmPendingSprintComments({
    commentIds: [input.commentId],
    sprintId: input.sprintId,
  });
  if (count > 0) {
    return 'ok';
  }
  const alreadyConfirmed = await hasSprintComment(input);
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
