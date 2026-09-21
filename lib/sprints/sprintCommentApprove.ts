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

export function approveAllPendingSprintComments(input: {
  sprintId: number;
}): Promise<number> {
  return confirmAllPendingSprintComments(input);
}

export function rejectAllPendingSprintComments(input: {
  sprintId: number;
}): Promise<number> {
  return deleteAllPendingSprintComments(input);
}
