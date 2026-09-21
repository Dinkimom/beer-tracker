import type { Comment, Task } from '@/types';

import { isSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { resolveTaskFeatureRowId } from '@/features/swimlane/utils/featureSwimlaneRows';
import { isSwimlaneImageTaskId } from '@/features/task/utils/swimlaneImageTask';

export function isFeatureLaneAnnotationTask(task: Pick<Task, 'id' | 'localDraftKind'>): boolean {
  return (
    task.localDraftKind === 'comment' ||
    task.localDraftKind === 'diagram' ||
    task.localDraftKind === 'image' ||
    isSwimlaneImageTaskId(task.id)
  );
}

export function isOnFeatureLaneRow(
  rowId: string,
  item: Pick<Task, 'assignee' | 'epic' | 'id' | 'parent'>
): boolean {
  if (item.id === rowId) {
    return true;
  }
  return resolveTaskFeatureRowId(item) === rowId;
}

export function isOnFeatureLaneCommentRow(
  rowId: string,
  comment: Pick<Comment, 'assigneeId' | 'parent'>
): boolean {
  if (comment.assigneeId === rowId) {
    return true;
  }
  return resolveTaskFeatureRowId({
    assignee: comment.assigneeId,
    parent: comment.parent,
  }) === rowId;
}

export function collectFeatureLaneRowComments(
  rowId: string,
  comments: readonly Comment[]
): Comment[] {
  return comments.filter((comment) => isOnFeatureLaneCommentRow(rowId, comment));
}

export function collectFeatureLaneRowWorkTasks(rowId: string, tasks: readonly Task[]): Task[] {
  return tasks.filter((task) => {
    if (!isOnFeatureLaneRow(rowId, task)) {
      return false;
    }
    if (isSwimlaneCommentTaskId(task.id) || isFeatureLaneAnnotationTask(task)) {
      return false;
    }
    return true;
  });
}

export function deleteFeatureLaneRowAnnotations(input: {
  comments: readonly Comment[];
  rowId: string;
  tasks: readonly Task[];
  onCommentDelete: (commentId: string) => void;
  onDeleteAnnotationTask: (taskId: string) => void;
}): void {
  for (const comment of input.comments) {
    if (isOnFeatureLaneCommentRow(input.rowId, comment)) {
      input.onCommentDelete(comment.id);
    }
  }
  for (const task of input.tasks) {
    if (!isOnFeatureLaneRow(input.rowId, task)) {
      continue;
    }
    if (isSwimlaneCommentTaskId(task.id) || !isFeatureLaneAnnotationTask(task)) {
      continue;
    }
    input.onDeleteAnnotationTask(task.id);
  }
}
