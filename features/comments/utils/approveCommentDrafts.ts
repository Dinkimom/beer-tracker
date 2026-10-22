import type { Comment } from '@/types';

/**
 * Принять черновики агента на клиенте, не дожидаясь сервера. Обычный черновик (createNote)
 * становится заметкой. Черновик-замена исчезает: правка переносится в оригинал, удаление убирает его.
 */
export function approveCommentDraftsLocally(comments: readonly Comment[], ids: ReadonlySet<string>): Comment[] {
  const replacements = new Map<string, Comment>();
  for (const comment of comments) {
    if (ids.has(comment.id) && comment.pendingApproval === true && comment.replacesCommentId) {
      replacements.set(comment.replacesCommentId, comment);
    }
  }
  const result: Comment[] = [];
  for (const comment of comments) {
    if (ids.has(comment.id) && comment.replacesCommentId) {
      continue;
    }
    const draft = replacements.get(comment.id);
    if (draft?.replaceAction === 'delete') {
      continue;
    }
    if (draft) {
      result.push({
        ...comment,
        assigneeId: draft.assigneeId,
        color: draft.color,
        day: draft.day,
        height: draft.height,
        parent: draft.parent,
        part: draft.part,
        text: draft.text,
        width: draft.width,
      });
      continue;
    }
    result.push(ids.has(comment.id) ? { ...comment, pendingApproval: undefined } : comment);
  }
  return result;
}
